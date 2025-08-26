import json
import asyncio
from django.core.cache import cache
from channels.layers import get_channel_layer
from channels.generic.websocket import AsyncWebsocketConsumer

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user or user.is_anonymous:
            await self.close()
            return

        self.join_code = self.scope["url_route"]["kwargs"]["join_code"]
        self.game_group = f"game_{self.join_code}"
        # use user's id instead of username since usernames can contain characters that aren't allowed in a group name
        self.user_group = f"game_{self.join_code}_user_{user.id}"

        key = f"game_{self.join_code}_users"
        users = cache.get(key, {})

        user_info = {
            "id": user.id,
            "username": user.username,
            "is_staff": user.is_staff,
        }
        
        await self.channel_layer.group_add(self.game_group, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()

        await self.send(text_data=json.dumps({
            "channel": "users",
            "action": "user_list",
            "data": {
                "users": list(users.values())
            }
        }))

        users[user.id] = user_info
        cache.set(key, users, timeout=None)

        await self.channel_layer.group_send(
            self.game_group,
            {
                "type": "handle.message",
                "channel": "users",
                "action": "user_join",
                "data": user_info,
            }
        )

        if len(users) == 1:
            asyncio.create_task(start_timer(self.join_code))

        
    async def disconnect(self, close_code):
        user = self.scope["user"]

        key = f"game_{self.join_code}_users"
        users = cache.get(key, {})
        if user.id in users:
            user_info = users.pop(user.id)
            cache.set(key, users, timeout=None)

            await self.channel_layer.group_send(
                self.game_group,
                {
                    "type": "handle.message",
                    "channel": "users",
                    "action": "user_leave",
                    "data": user_info,
                }
            )
        
        await self.channel_layer.group_discard(self.game_group, self.channel_name)
        await self.channel_layer.group_discard(self.user_group, self.channel_name)
    
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
        socket.addEventListener("message", event => {
            const msg = JSON.parse(event.data);
            if (msg.channel == "chat") {
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
    
    # --------------- #
    # handlers        #
    # --------------- #
    async def handle_messages_message_send(self, data):
        recipient_id = data.get("id")
        target_group = f"game_{self.join_code}_user_{recipient_id}"
        return target_group

# -------------- #
# game timer     #
# -------------- #
async def start_timer(join_code):
    channel_layer = get_channel_layer()  # get the global/shared layer
    timer_key = f"game_{join_code}_timer"
    users_key = f"game_{join_code}_users"
    game_group = f"game_{join_code}"

    if cache.get(timer_key, False):
        return
    cache.set(timer_key, True, timeout=None)

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

    cache.set(timer_key, False, timeout=None)