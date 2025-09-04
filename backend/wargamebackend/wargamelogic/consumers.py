import json
import asyncio
from django.core.cache import cache
from channels.layers import get_channel_layer
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import User
from wargamelogic.models.static import Team, Role
from wargamelogic.models.dynamic import RoleInstance

teams_cache = None
roles_cache = None

@database_sync_to_async
def load_data():
    global teams_cache
    global roles_cache
    if teams_cache is None:
        teams_cache = list(Team.objects.all())
    if roles_cache is None:
        roles_cache = list(Role.objects.select_related("branch").all())
    return teams_cache, roles_cache

# You don't need to understand this code to be able to use the WebSocket.
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

        role_instance_json = redis_client.hget(role_key, user.id)
        if role_instance_json:
            role_instance = json.loads(role_instance_json)
            redis_client.hdel(role_key, user.id)

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
        for channel in getattr(self, "channel_groups", []):
            await self.channel_layer.group_discard(channel, self.channel_name)

        print(f"{user.username} disconnected from game '{self.join_code}'.")
    
    # when sending a message over a websocket in the browser,
    # it gets sent to this function to handle it, which then sends the message
    # to the correct group.
    # flow: frontend sender's socket.send() -> backend sender's receive() 
    # -> backend receiver's handle_message() -> frontend receiver's socket.onmessage("message", ...)
    async def receive(self, text_data):
        """
        text_data JSON format:
        {
            "channel": "chat" | "points" | "timer" | "units" | "users" | ...,
            "action": "send" | "start" | "move" | ...,
            "data": {...}
        }
        """
        event = json.loads(text_data)
        channel = event.get("channel", "default")
        action = event.get("action", "unknown")
        data = event.get("data", {})
        data["sender_id"] = self.scope["user"].id


        target_group = self.game_group
        send_data = data

        handler_name = f"handle_{channel}_{action}"
        handler = getattr(self, handler_name, None)

        if handler:
            target_group = None
            target_group, send_data = await handler(data)

        if target_group:
            await self.channel_layer.group_send(
                target_group,
                {
                    "type": "handle.message",
                    "channel": channel,
                    "action": action,
                    "data": send_data,
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
    # and perform side-effects, or change the data that is sent.
    # These should return the group that the message should be sent to,
    # Whether the group containing all the users in this game, 
    # The group containing just a specific user in the game,
    # Or if you raise an exception it won't be sent to anybody.
    async def handle_users_list(self, data):
        """
        data: {}
        """
        redis_client = get_redis_client()
        role_key = f"game_{self.join_code}_role_instances"

        role_instances = {
            int(uid): json.loads(val)
            for uid, val in redis_client.hgetall(role_key).items()
        }

        return self.user_group, list(role_instances.values())

    async def handle_users_join(self, data):
        """
        data: RoleInstance
        """
        user = self.scope["user"]
        if data.get("user", {}).get("username") != user.username:
            raise Exception(f"{user.username} tried joining as {data.get('user', {}).get('username')} in game '{self.join_code}'.")

        redis_client = get_redis_client()
        role_key = f"game_{self.join_code}_role_instances"

        if redis_client.hexists(role_key, user.id):
            raise Exception(f"{user.username} tried joining game '{self.join_code}', a game they had already joined.")
        
        teams, roles = await load_data()
        self.channel_groups = get_user_channel_groups(self.join_code, teams, roles, data)
        for group in self.channel_groups:
            await self.channel_layer.group_add(group, self.channel_name)

        redis_client.hset(role_key, user.id, json.dumps(data))

        if redis_client.hlen(role_key) == 1:
            asyncio.create_task(start_timer(self.join_code, user.username))

        return self.game_group, data

    async def handle_role_instances_delete(self, data):
        """
        data: RoleInstance
        """
        recipient_id = data.get("id")
        if not recipient_id:
            user= self.scope["user"]
            raise Exception(f"{user.username} did not provide the id of the user whose role they're deleting.")
        target_group = f"game_{self.join_code}_user_{recipient_id}"
        return target_group, data

    async def handle_chat_list(self, data):
        """
        data: {}
        """
        # TODO
        return self.user_group, data

    async def handle_chat_send(self, data):
        """
        data: Message
        """
        sender_team_name = data["sender_role_instance"]["team_instance"]["team"]["name"].replace(" ", "")
        sender_role_name = data["sender_role_instance"]["role"]["name"].replace(" ", "")

        destination_team_name = data["destination_team_name"].replace(" ", "")
        destination_role_name = data["destination_role_name"].replace(" ", "")

        a, b = sorted([
            f"{sender_team_name}{sender_role_name}",
            f"{destination_team_name}{destination_role_name}"
        ])
        target_group = f"game_{self.join_code}_channel_{a}_{b}"

        if target_group not in self.channel_groups:
            raise Exception(f"User {data['role_instance']['user']['username']} on team {sender_team_name} with role {sender_role_name} is not in group {target_group}")

        return target_group, data

# ---------------- #
# Redis helpers    #
# ---------------- #
def get_redis_client():
    """Get the synchronous Redis client."""
    return cache.client.get_client(write=True)

# -------------------- #
# helper functions     #
# -------------------- #
async def start_timer(join_code, username):
    # I'm pretty sure this only works under the assumption that we are using one channel
    channel_layer = get_channel_layer()
    timer_key = f"game_{join_code}_timer"
    game_group = f"game_{join_code}"
    redis_client = get_redis_client()

    # potential race condition here that I'm ignoring for now.
    if redis_client.exists(timer_key):
        print(f"{username} tried starting {join_code}'s timer but there was already a key for it in the cache")
        return

    remaining = 600

    print(f"{username} started {join_code}'s timer.")

    # while remaining > 0:
    #     await channel_layer.group_send(
    #         game_group,
    #         {
    #             "type": "handle.message",
    #             "channel": "timer",
    #             "action": "update",
    #             "data": {"remaining": remaining},
    #         },
    #     )
    #     await asyncio.sleep(1)
    #     remaining -= 1

    redis_client.delete(timer_key)
    print(f"Timer for game '{join_code}' finished.")


def get_user_channel_groups(join_code, teams, roles, role_instance):
    role_name = role_instance["role"]["name"]
    user_team_name = role_instance["team_instance"]["team"]["name"]
    gamemaster_team_name = "Gamemasters"

    if role_name == "Gamemaster":
        groups = (
            [(gamemaster_team_name, "Gamemaster")] +
            [(t.name, r.name) for r in roles if r.name != "Gamemaster" for t in teams if t.name != gamemaster_team_name]
        )

    elif role_name == "Ambassador":
        groups = (
            [(gamemaster_team_name, "Gamemaster")] +
            [(t.name, role_name) for t in teams if t.name != gamemaster_team_name] +
            [(user_team_name, "Combatant Commander")] +
            [(user_team_name, r.name) for r in roles if r.is_chief_of_staff]
        )

    elif role_name == "Combatant Commander":
        groups = (
            [(user_team_name, role_name), (gamemaster_team_name, "Gamemaster"), (user_team_name, "Ambassador")] +
            [(user_team_name, r.name) for r in roles if r.is_chief_of_staff]
        )

    elif role_instance["role"]["is_chief_of_staff"]:
        groups = (
            [(user_team_name, role_name), (gamemaster_team_name, "Gamemaster"), (user_team_name, "Combatant Commander")] +
            [(user_team_name, r.name) for r in roles if r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        )

    elif role_instance["role"]["is_commander"]:
        groups = (
            [(gamemaster_team_name, "Gamemaster")] +
            [(user_team_name, r.name) for r in roles if r.is_chief_of_staff and r.branch.name == role_instance["role"]["branch"]["name"]] +
            [(user_team_name, r.name) for r in roles if r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]] +
            [(user_team_name, r.name) for r in roles if r.is_vice_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        )

    elif role_instance["role"]["is_vice_commander"]:
        groups = (
            [(gamemaster_team_name, "Gamemaster")] +
            [(user_team_name, r.name) for r in roles if r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]] +
            [(user_team_name, r.name) for r in roles if r.is_vice_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        )

    else:
        groups = []

    channel_groups = sorted([
        f"game_{join_code}_channel_{teamRole1}_{teamRole2}"
        for team, role in groups
        for teamRole1, teamRole2 in [sorted([f"{user_team_name}{role_name}".replace(" ", ""), f"{team}{role}".replace(" ", "")])]
    ])

    return channel_groups
