import json
from channels.generic.websocket import AsyncWebsocketConsumer
import datetime
from django.contrib.auth import get_user_model

class UsersConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "active_users"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.broadcast_users()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        await self.broadcast_users()

    async def receive(self, text_data):
        """
        Expect incoming JSON like:
        {
          "type": "update_user",
          "username": "Jake",
          "branch": "Navy",
          "team": "Blue",
          "role": "Commander",
          "status": "notready"
        }
        """
        data = json.loads(text_data)

        if data.get("type") == "update_user":
            # store in memory or DB — here, we'll just broadcast
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "users.update",
                    "user": data
                }
            )

    async def broadcast_users(self):
        # If storing in DB, fetch here
        User = get_user_model()
        users = User.objects.all().values(
            "username", "branch", "team", "role", "status"
        )
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "users.list",
                "users": list(users)
            }
        )

    async def users_list(self, event):
        await self.send(text_data=json.dumps({
            "type": "users_list",
            "users": event["users"]
        }))

    async def users_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_update",
            "user": event["user"]
        }))

class MainMapConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = "mainmap"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get("message", "")
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message,
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "message": event["message"]
        }))


class UnitInstanceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("unit-instances", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("unit-instances", self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data["type"] == "unit_moved":
            # Broadcast updated position to all
            await self.channel_layer.group_send(
                "unit-instances",
                {
                    "type": "unit_instance.update",
                    "message": json.dumps(data),
                }
            )

    async def unit_instance_update(self, event):
        await self.send(text_data=event["message"])
class TimerConsumer(AsyncWebsocketConsumer):
    timer_duration = 600  # 10 minutes in seconds
    start_time = datetime.datetime.utcnow()

    async def connect(self):
        await self.channel_layer.group_add("global_timer", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("global_timer", self.channel_name)

    async def send_time_update(self, event):
        await self.send(text_data=json.dumps({
            "remaining_seconds": event["remaining_seconds"]
        }))
