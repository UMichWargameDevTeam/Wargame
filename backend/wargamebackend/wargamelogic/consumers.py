import json
import asyncio
from django.core.cache import cache
from channels.layers import get_channel_layer
from channels.generic.websocket import AsyncWebsocketConsumer


def get_redis_client():
    return cache.client.get_client(write=True)


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user or user.is_anonymous:
            await self.close()
            return

        self.join_code = self.scope["url_route"]["kwargs"]["join_code"]
        self.game_group = f"game_{self.join_code}"
        self.user_group = f"game_{self.join_code}_user_{user.id}"

        await self.channel_layer.group_add(self.game_group, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        print(f"{user.username} connected.")
        await self.accept()

    async def disconnect(self, close_code):
        user = self.scope["user"]
        if not hasattr(self, "join_code"):
            return

        redis_client = get_redis_client()
        role_key = f"game_{self.join_code}_role_instances"

        # Remove role instance and broadcast leave
        role_instance_json = redis_client.hget(role_key, user.id)
        if role_instance_json:
            role_instance = json.loads(role_instance_json)
            redis_client.hdel(role_key, user.id)

            await self.channel_layer.group_send(
                self.game_group,
                {
                    "type": "handle.message",
                    "channel": "users",
                    "action": "user_leave",
                    "data": role_instance,
                }
            )

        # Remove from channel groups
        await self.channel_layer.group_discard(self.game_group, self.channel_name)
        await self.channel_layer.group_discard(self.user_group, self.channel_name)

        print(f"{user.username} disconnected.")
    
    # when sending a message over a websocket in the browser,
    # it gets sent to this function to handle it, which then sends the message
    # to the correct group.
    async def receive(self, text_data):
        """
        text_data JSON format:
        {
            "channel": "messages" | "points" | "timer" | "units" | "users" | ...,
            "action": "message_send" | "points_send" | "unit_move" | ...,
            "data": {...}
        }
        """
        event = json.loads(text_data)
        channel = event.get("channel", "default")
        action = event.get("action", "unknown")
        data = event.get("data", {})
        data["sender_id"] = self.scope["user"].id

        handler_name = f"handle_{channel}_{action}"
        handler = getattr(self, handler_name, None)

        if handler:
            target_group = await handler(data)
        else:
            target_group = self.game_group

        if target_group:  # only send if target_group is valid
            await self.channel_layer.group_send(
                target_group,
                {
                    "type": "handle.message",
                    "channel": channel,
                    "action": action,
                    "data": data,
                }
            )

    # when receiving a message over a websocket from a group,
    # it gets handled by this function,
    # which then sends the message to the browser.
    async def handle_message(self, event):
        """
        Receive from group and forward to browser.
        Example of how to handle in the browser:
        socketRef.current?.addEventListener("message", event => {
            const msg = JSON.parse(event.data);
            if (msg.channel == "users") {
                ...
            }
        });
        """
        await self.send(
            text_data=json.dumps({
                "channel": event["channel"],
                "action": event["action"],
                "data": event["data"],
            })
        )

    # ---------------- #
    # handlers         #
    # ---------------- #

    async def handle_users_user_join(self, data):
        user = self.scope["user"]
        if data.get("user", {}).get("username") != user.username:
            print(f"{user.username} tried joining as {data.get('user', {}).get('username')}")
            return self.user_group

        redis_client = get_redis_client()
        role_key = f"game_{self.join_code}_role_instances"

        # Send existing role instances to the new user
        role_instances = {
            int(uid): json.loads(val)
            for uid, val in redis_client.hgetall(role_key).items()
        }
        await self.send(
            text_data=json.dumps({
                "channel": "users",
                "action": "users_list",
                "data": list(role_instances.values()),
            })
        )

        # Check if user already joined
        if redis_client.hexists(role_key, user.id):
            print(f"{user.username} tried joining {self.join_code}, a game they had already joined.")
            await self.send(text_data=json.dumps({
                "channel": "users",
                "action": "error",
                "data": {"message": "Already joined"}
            }))
            return None

        # Store this user's role instance
        redis_client.hset(role_key, user.id, json.dumps(data))

        # If this is the first user, start the timer
        if redis_client.hlen(role_key) == 1:
            asyncio.create_task(start_timer(self.join_code, user.username))

        return self.game_group

    async def handle_messages_message_send(self, data):
        recipient_id = data.get("id")
        target_group = f"game_{self.join_code}_user_{recipient_id}"
        return target_group


# -------------- #
# game timer     #
# -------------- #
async def start_timer(join_code, username):
    channel_layer = get_channel_layer()
    timer_key = f"game_{join_code}_timer"
    game_group = f"game_{join_code}"
    redis_client = get_redis_client()

    if redis_client.get(timer_key):
        print(f"{username} tried starting {join_code}'s timer but there was already a key for it in the cache")
        return
    
    print(f"{username} started {join_code}'s timer.")

    redis_client.set(timer_key, 1)

    remaining = 600
    while remaining > 0:
        await channel_layer.group_send(
            game_group,
            {
                "type": "handle.message",
                "channel": "timer",
                "action": "timer_update",
                "data": {"remaining": remaining},
            },
        )
        await asyncio.sleep(1)
        remaining -= 1

    redis_client.set(timer_key, 0)
