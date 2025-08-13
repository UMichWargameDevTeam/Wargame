import json
from channels.generic.websocket import AsyncWebsocketConsumer
import datetime
from django.contrib.auth import get_user_model

connected_users = {}  # {game_id: [{username, team, branch, role, ready}]}

class GameUsersConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.username = self.scope['session'].get('username', 'Guest')
        
        # Add to connected users
        connected_users.setdefault(self.game_id, []).append({
            "username": self.scope['session'].get('username', 'Guest'),
            "team": self.scope['session'].get('team', 'Unknown'),
            "branch": self.scope['session'].get('branch', 'Unknown'),
            "role": self.scope['session'].get('role', 'Unknown'),
            "ready": False
        })

        await self.channel_layer.group_add(self.game_id, self.channel_name)
        await self.accept()
        await self.send_user_list()

    async def disconnect(self, close_code):
        if self.game_id in connected_users:
            connected_users[self.game_id] = [
                u for u in connected_users[self.game_id] if u["username"] != self.username
            ]
        await self.channel_layer.group_discard(self.game_id, self.channel_name)
        await self.send_user_list()

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("type") == "join":
            self.username = data["username"]
            connected_users.setdefault(self.game_id, []).append({
                "username": self.username,
                "team": data.get("team", "Unknown"),
                "branch": data.get("branch", "Unknown"),
                "role": data.get("role", "Unknown"),
                "ready": data.get("ready", False)
            })
            await self.send_user_list()

        elif data.get("type") == "ready_status":
            for u in connected_users.get(self.game_id, []):
                if u["username"] == self.username:
                    u["ready"] = data.get("ready", False)
            await self.send_user_list()


    async def send_user_list(self):
        # Sort team → branch → role
        sorted_users = sorted(
            connected_users.get(self.game_id, []),
            key=lambda x: (x["team"], x["branch"], x["role"])
        )
        await self.channel_layer.group_send(
            self.game_id,
            {
                "type": "user_list",
                "users": sorted_users
            }
        )

    async def user_list(self, event):
        await self.send(text_data=json.dumps({"type": "user_list", "users": event["users"]}))

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
