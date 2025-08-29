import json
import asyncio
from django.core.cache import cache
from channels.layers import get_channel_layer
from channels.generic.websocket import AsyncWebsocketConsumer
from redis.exceptions import WatchError

# You don't need to understand this code to be able to use the WebSocket.
# This code can get complicated due to handling potential concurrency issues.
# What you need to know is that any message sent over the WebSocket should be an object
# Containing "channel", "action", and "data" properties.
# You can set "channel" and "action" to whatever strings you want; you just need to make sure
# That what you're sending matches what the recipient is expecting.
# Typically, I set "channel" to the type of the entity that is being acted on (for example, "users"),
# Then set "action" to the action being done to that entity.
# "data" is an object that can contain whatever kind of data you want,
# Though typically it matches the shape of a record in one of the database's tables,
# Or an array of such records.

# You should only need to add to this code if you want 
# your message to be sent to a specific user in your game rather than everyone in your game.
# That can be done by creating a handler function for your specific channel and action.

class GameConsumer(AsyncWebsocketConsumer):
    # A user must be logged-in to connect to the WebSocket.
    # If successful, they're added to two groups,
    # One with everyone in their game, and one for just this game and user.
    # These groups can be used to specify who a message should be sent to.
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

        print(f"{user.username} connected to game '{self.join_code}'.")
        await self.accept()


    async def disconnect(self, close_code):
        user = self.scope["user"]
        if not hasattr(self, "join_code"):
            return

        redis_client = get_redis_client()
        role_key = f"game_{self.join_code}_role_instances"

        role_instance_json = await redis_execute(redis_delete_hfield_atomic, redis_client, role_key, user.id)
        if role_instance_json:
            role_instance = json.loads(role_instance_json)
            await self.channel_layer.group_send(
                self.game_group,
                {
                    "type": "handle.message",
                    "channel": "users",
                    "action": "leave",
                    "data": role_instance,
                }
            )

        await self.channel_layer.group_discard(self.game_group, self.channel_name)
        await self.channel_layer.group_discard(self.user_group, self.channel_name)
        print(f"{user.username} disconnected from game '{self.join_code}'.")
    
    # when sending a message over a websocket in the browser,
    # it gets sent to this function to handle it, which then sends the message
    # to the correct group.
    async def receive(self, text_data):
        """
        text_data JSON format:
        {
            "channel": "messages" | "points" | "timer" | "units" | "users" | ...,
            "action": "send" | "send" | "move" | ...,
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
            try:
                target_group = await handler(data)
            except Exception as e:
                print(f"Error in handler {handler_name}: {e}")
                target_group = None
        else:
            target_group = self.game_group

        if target_group:
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
    # Can have handlers to handle specific channel/action messages.
    # By default, messages are simply broadcast to everyone in the game,
    # But with a handler you can make it send a message to only a specific user,
    # and perform side-effects.
    # These should return the group that the message should be sent to,
    # Whether the group containing all the users in this game, 
    # The group containing just a specific user in the game,
    # Or if you raise an exception it won't be sent to anybody.
    async def handle_users_join(self, data):
        user = self.scope["user"]
        if data.get("user", {}).get("username") != user.username:
            raise Exception(f"{user.username} tried joining as {data.get('user', {}).get('username')} in game '{self.join_code}'.")

        redis_client = get_redis_client()
        role_key = f"game_{self.join_code}_role_instances"

        role_instances = await redis_execute(lambda: {
            int(uid): json.loads(val)
            for uid, val in redis_client.hgetall(role_key).items()
        })
        await self.send(
            text_data=json.dumps({
                "channel": "users",
                "action": "list",
                "data": list(role_instances.values()),
            })
        )

        added = await redis_execute(lambda: redis_client.hsetnx(role_key, user.id, json.dumps(data)))
        if not added:
            raise Exception(f"{user.username} tried joining {self.join_code} but they had already joined.")

        # the start_timer function ensures only the first user starts the timer.
        asyncio.create_task(start_timer(self.join_code, user.username))

        return self.game_group

    async def handle_role_instances_delete(self, data):
        recipient_id = data.get("id")
        if not recipient_id:
            return None
        target_group = f"game_{self.join_code}_user_{recipient_id}"
        return target_group

    async def handle_messages_send(self, data):
        recipient_id = data.get("id")
        if not recipient_id:
            return None
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

    remaining = 600

    # Atomically set timer key only if it doesn't already exist, else return
    started = await redis_execute(lambda: redis_client.set(timer_key, 1, nx=True, ex=remaining + 15))
    if not started:
        return

    print(f"{username} started {join_code}'s timer.")

    while remaining > 0:
        await channel_layer.group_send(
            game_group,
            {
                "type": "handle.message",
                "channel": "timer",
                "action": "update",
                "data": {"remaining": remaining},
            },
        )
        await asyncio.sleep(1)
        remaining -= 1

    await redis_execute(lambda: redis_client.delete(timer_key))
    print(f"Timer for game '{join_code}' finished.")


# ---------------- #
# Redis helpers    #
# ---------------- #
def get_redis_client():
    """Get the synchronous Redis client."""
    return cache.client.get_client(write=True)

async def redis_execute(func, *args, **kwargs):
    """Run synchronous Redis function in async thread."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

def redis_delete_hfield_atomic(redis_client, key, field):
    """Atomically delete a hash field if it exists and return its value."""
    while True:
        try:
            pipe = redis_client.pipeline()
            pipe.watch(key)
            val = pipe.hget(key, field)
            if val is None:
                pipe.unwatch()
                return None
            pipe.multi()
            pipe.hdel(key, field)
            pipe.execute()
            return val
        except WatchError:
            continue