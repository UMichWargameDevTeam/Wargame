import json
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer

connected_users = {}  # {game_id: [{username, team, branch, role, ready}]}

class GameUsersConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.join_code = self.scope["url_route"]["kwargs"]["join_code"]
        self.username = self.scope["session"].get("username", "Guest")

        # Add to connected users per join_code
        connected_users.setdefault(self.join_code, []).append({
            "username": self.username,
            "team_name": self.scope["session"].get("team_name", "Unknown"),
            "branch_name": self.scope["session"].get("branch_name", "Unknown"),
            "role_name": self.scope["session"].get("role_name", "Unknown"),
            "ready": False
        })

        await self.channel_layer.group_add(f"game_{self.join_code}_users", self.channel_name)
        await self.accept()
        await self.send_user_list()

    async def disconnect(self, close_code):
        if self.join_code in connected_users:
            connected_users[self.join_code] = [
                u for u in connected_users[self.join_code] if u["username"] != self.username
            ]
        await self.channel_layer.group_discard(f"game_{self.join_code}_users", self.channel_name)
        await self.send_user_list()

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data.get("type") == "join":
            self.username = data["username"]
            connected_users.setdefault(self.join_code, []).append({
                "username": self.username,
                "team_name": data.get("team_name", "Unknown"),
                "branch_name": data.get("branch_name", "Unknown"),
                "role_name": data.get("role_name", "Unknown"),
                "ready": data.get("ready", False)
            })
            await self.send_user_list()

        elif data.get("type") == "ready_status":
            for u in connected_users.get(self.join_code, []):
                if u["username"] == self.username:
                    u["ready"] = data.get("ready", False)
            await self.send_user_list()

    async def send_user_list(self):
        sorted_users = sorted(
            connected_users.get(self.join_code, []),
            key=lambda x: (x["team_name"], x["branch_name"], x["role_name"])
        )
        await self.channel_layer.group_send(
            f"game_{self.join_code}_users",
            {
                "type": "user_list",
                "users": sorted_users
            }
        )

    async def user_list(self, event):
        await self.send(text_data=json.dumps({"type": "user_list", "users": event["users"]}))


class MainMapConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.join_code = self.scope["url_route"]["kwargs"]["join_code"]
        self.room_group_name = f"mainmap_{self.join_code}"
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
        self.join_code = self.scope["url_route"]["kwargs"]["join_code"]
        self.room_group_name = f"unit_instances_{self.join_code}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data["type"] == "unit_moved":
            await self.channel_layer.group_send(
                self.room_group_name,
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
        self.join_code = self.scope["url_route"]["kwargs"]["join_code"]
        self.room_group_name = f"global_timer_{self.join_code}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def send_time_update(self, event):
        await self.send(text_data=json.dumps({
            "remaining_seconds": event["remaining_seconds"]
        }))
