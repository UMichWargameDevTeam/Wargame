import json
from channels.generic.websocket import AsyncWebsocketConsumer
import asyncio
import datetime

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


class UnitConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("units", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("units", self.channel_name)

    async def receive(self, text_data):
        # Broadcast to group
        await self.channel_layer.group_send(
            "units",
            {
                "type": "unit.update",
                "message": text_data,
            }
        )

    async def unit_update(self, event):
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
