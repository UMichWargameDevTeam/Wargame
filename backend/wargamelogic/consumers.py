import json
from django.core.cache import cache
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from wargamelogic.models.static import Team, Role


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


# What you need to know is that any message sent over the WebSocket should be an object
# Containing "channel", "action", and "data" properties.
# You can set "channel" and "action" to whatever strings you want; you just need to make sure
# That what you're sending matches what the recipient is expecting.
# Typically, I set "channel" to the type of the entity that is being acted on (for example, "users"),
# Then set "action" to the action being done to that entity.
# "data" is an object that can contain whatever kind of data you want,
# Though typically it matches the shape of a record in one of the database's tables,
# Or an array of such records.
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
        for group in getattr(self, "channel_groups", []):
            await self.channel_layer.group_discard(group, self.channel_name)
        for group in getattr(self, "transfer_groups", []):
            await self.channel_layer.group_discard(group, self.channel_name)

        print(f"{user.username} disconnected from game '{self.join_code}'.")

    # when sending a message over a WebSocket in the browser,
    # it gets sent to this function to handle it, which then sends the message
    # to the correct group.
    # flow: frontend sender's socket.send() -> backend sender's receive()
    # -> backend receiver's handle_message() -> frontend receiver's socket.onmessage("message", ...)
    async def receive(self, text_data):
        """
        text_data JSON format:
        {
            "channel": "communications" | "points" | "turn" | "units" | "users" | ...,
            "action": "send" | "start" | "move" | ...,
            "data": {...}
        }
        """
        event = json.loads(text_data)
        channel = event.get("channel", "default")
        action = event.get("action", "unknown")
        data = event.get("data", {})

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

    # when receiving a message over a WebSocket from a group,
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
    # These should return the group that the message should be sent to.
    # If you raise an exception it won't be sent to anybody.
    async def handle_users_list(self, data):
        """
        data: RoleInstance
        """
        user = self.scope["user"]

        if data["user"]["username"] != user.username:
            raise Exception(f"{user.username} tried requesting the user list in game '{self.join_code}' but as the wrong user or did not provide role data.")

        redis_client = get_redis_client()
        role_instances_key = f"game_{self.join_code}_role_instances"

        role_instances = {
            int(uid): json.loads(val)
            for uid, val in redis_client.hgetall(role_instances_key).items()
        }

        user_team = data["team_instance"]["team"]["name"]

        if user_team == "Gamemasters":
            return self.user_group, list(role_instances.values())

        same_team_role_instances = [
            ri for ri in role_instances.values()
            if ri["team_instance"]["team"]["name"] == user_team
        ]

        return self.user_group, same_team_role_instances

    async def handle_users_join(self, data):
        """
        data: RoleInstance
        """
        user = self.scope["user"]
        user_username = data["user"]["username"]

        if user_username != user.username:
            raise Exception(f"{user.username} tried joining as {user_username} in game '{self.join_code}'.")

        redis_client = get_redis_client()
        role_key = f"game_{self.join_code}_role_instances"

        if redis_client.hexists(role_key, user.id):
            raise Exception(f"{user_username} tried joining game '{self.join_code}', a game they had already joined.")

        teams, roles = await load_data()
        user_team = data["team_instance"]["team"]["name"]

        self.team_group = f"game_{self.join_code}_team_{user_team}".replace(" ", "")

        if user_team == "Gamemasters":
            for team in teams:
                team_group = f"game_{self.join_code}_team_{team.name}".replace(" ", "")
                await self.channel_layer.group_add(team_group, self.channel_name)
        else:
            await self.channel_layer.group_add(self.team_group, self.channel_name)

        user_role = data["role"]["name"]
        self.team_role_group = f"game_{self.join_code}_team_role_{user_team}{user_role}".replace(" ", "")
        await self.channel_layer.group_add(self.team_role_group, self.channel_name)

        self.channel_groups = get_user_channel_groups(self.join_code, teams, roles, data)
        for group in self.channel_groups:
            await self.channel_layer.group_add(group, self.channel_name)

        self.transfer_groups = get_user_transfer_groups(self.join_code, teams, roles, data)
        for group in self.transfer_groups:
            await self.channel_layer.group_add(group, self.channel_name)

        redis_client.hset(role_key, user.id, json.dumps(data))

        return self.team_group, data

    async def handle_users_ready(self, data):
        return self.team_group, data

    async def handle_role_instances_delete(self, data):
        """
        data: RoleInstance
        """
        recipient_id = data.get("id")

        if not recipient_id:
            user = self.scope["user"]
            raise Exception(f"{user.username} did not provide the id of the user whose role they're deleting.")

        target_group = f"game_{self.join_code}_user_{recipient_id}"
        return target_group, data

    async def handle_communications_send(self, data):
        """
        data: Message
        """
        sender_team_name = data["sender_role_instance"]["team_instance"]["team"]["name"].replace(" ", "")
        sender_role_name = data["sender_role_instance"]["role"]["name"].replace(" ", "")

        recipient_team_name = data["recipient_team_name"].replace(" ", "")
        recipient_role_name = data["recipient_role_name"].replace(" ", "")

        a, b = sorted([
            f"{sender_team_name}{sender_role_name}",
            f"{recipient_team_name}{recipient_role_name}"
        ])
        target_group = f"game_{self.join_code}_channel_{a}_{b}"

        if target_group not in self.channel_groups:
            user = self.scope["user"]
            raise Exception(f"User {user.username} on team {sender_team_name} with role {sender_role_name} is not in group {target_group}")

        return target_group, data

    async def handle_points_send(self, data):
        """
        data: Message
        """
        sender_team_name = data["sender_role_instance"]["team_instance"]["team"]["name"]
        sender_role_name = data["sender_role_instance"]["role"]["name"]

        recipient_team_name = data["recipient_team_name"]
        recipient_role_name = data["recipient_role_name"]

        target_group = f"game_{self.join_code}_transfer_{sender_team_name}{sender_role_name}_{recipient_team_name}{recipient_role_name}".replace(" ", "")

        if target_group not in self.transfer_groups:
            user = self.scope["user"]
            raise Exception(f"User {user.username} on team {sender_team_name} with role {sender_role_name} is not in group {target_group}")

        return target_group, data

    async def handle_points_spend(self, data):
        """
        data: {
            team_name: string;
            role_name: string;
            supply_points: number;
        }
        """
        sender_team_name = data["team_name"]
        sender_role_name = data["role_name"]

        target_group = self.team_role_group

        if not hasattr(self, "team_role_group"):
            username = self.scope["user"].username
            raise Exception(f"User {username} on team {sender_team_name} with role {sender_role_name} is not in group {target_group}")

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
def get_user_channel_groups(join_code, teams, roles, role_instance):
    user_role_name = role_instance["role"]["name"]
    user_team_name = role_instance["team_instance"]["team"]["name"]
    gamemaster_team_name = "Gamemasters"

    groups = []

    if user_role_name == "Gamemaster":
        groups += (
            [(gamemaster_team_name, "Gamemaster")] +
            [(t.name, r.name) for r in roles if r.name != "Gamemaster" for t in teams if t.name != gamemaster_team_name]
        )

    if user_role_name == "Ambassador":
        groups += (
            [(gamemaster_team_name, "Gamemaster")] +
            [(t.name, user_role_name) for t in teams if t.name != gamemaster_team_name] +
            [(user_team_name, "Combatant Commander")] +
            [(user_team_name, r.name) for r in roles if r.is_chief_of_staff]
        )

    if user_role_name == "Combatant Commander":
        groups += (
            [(user_team_name, user_role_name), (gamemaster_team_name, "Gamemaster"), (user_team_name, "Ambassador")] +
            [(user_team_name, r.name) for r in roles if r.is_chief_of_staff]
        )

    if role_instance["role"]["is_chief_of_staff"]:
        groups += (
            [(user_team_name, user_role_name), (gamemaster_team_name, "Gamemaster"), (user_team_name, "Combatant Commander")] +
            [(user_team_name, r.name) for r in roles if r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        )

    if role_instance["role"]["is_commander"]:
        groups += (
            [(gamemaster_team_name, "Gamemaster")] +
            [(user_team_name, r.name) for r in roles if r.is_chief_of_staff and r.branch.name == role_instance["role"]["branch"]["name"]] +
            [(user_team_name, r.name) for r in roles if r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]] +
            [(user_team_name, r.name) for r in roles if r.is_vice_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        )

    if role_instance["role"]["is_vice_commander"]:
        groups += (
            [(gamemaster_team_name, "Gamemaster")] +
            [(user_team_name, r.name) for r in roles if r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]] +
            [(user_team_name, r.name) for r in roles if r.is_vice_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        )

    channel_groups = sorted([
        f"game_{join_code}_channel_{teamRole1}_{teamRole2}"
        for team, role in groups
        for teamRole1, teamRole2 in [sorted([f"{user_team_name}{user_role_name}".replace(" ", ""), f"{team}{role}".replace(" ", "")])]
    ])

    return channel_groups


def get_user_transfer_groups(join_code, teams, roles, role_instance):
    user_role_name = role_instance["role"]["name"]
    user_team_name = role_instance["team_instance"]["team"]["name"]
    gamemaster_team_name = "Gamemasters"

    transfer_to_groups = []
    transfer_from_groups = []

    if user_role_name == "Gamemaster":
        transfer_to_groups += [(t.name, r.name) for r in roles if r.name != "Gamemaster" for t in teams if t.name != gamemaster_team_name]
    else:
        transfer_from_groups += [(gamemaster_team_name, "Gamemaster")]

    if user_role_name == "Combatant Commander":
        transfer_to_groups += [(user_team_name, r.name) for r in roles if r.is_chief_of_staff]

    if role_instance["role"]["is_chief_of_staff"]:
        transfer_to_groups += [(user_team_name, r.name) for r in roles if r.is_logistics and r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        transfer_from_groups += [(user_team_name, r.name) for r in roles if r.name == "Combatant Commander"]

    if role_instance["role"]["is_commander"] and role_instance["role"]["is_logistics"]:
        transfer_to_groups += [(user_team_name, r.name) for r in roles if r.is_logistics and r.is_vice_commander and r.branch.name == role_instance["role"]["branch"]["name"]]
        transfer_from_groups += [(user_team_name, r.name) for r in roles if r.is_chief_of_staff and r.branch.name == role_instance["role"]["branch"]["name"]]

    if role_instance["role"]["is_vice_commander"] and role_instance["role"]["is_logistics"]:
        transfer_from_groups += [(user_team_name, r.name) for r in roles if r.is_commander and r.branch.name == role_instance["role"]["branch"]["name"]]

    transfer_groups = (
        sorted([
            f"game_{join_code}_transfer_{user_team_name}{user_role_name}_{team}{role}".replace(" ", "")
            for team, role in transfer_to_groups
        ]) +
        sorted ([
            f"game_{join_code}_transfer_{team}{role}_{user_team_name}{user_role_name}".replace(" ", "")
            for team, role in transfer_from_groups
        ])
    )

    return transfer_groups
