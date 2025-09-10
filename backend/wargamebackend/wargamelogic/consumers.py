import json
import time
from django.core.cache import cache
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from wargamelogic.models.static import Team, Role

teams_cache = None
roles_cache = None

@database_sync_to_async
def load_data():
    """
    Lazily load and cache Team and Role objects and return them.
    
    Loads all Team instances and all Role instances (with related `branch`) into the module-level
    caches `teams_cache` and `roles_cache` on first invocation; subsequent calls return the cached
    lists. Returns a tuple (teams_cache, roles_cache), where each element is a list of model instances.
    Note: this function performs database queries on first call and mutates module-level globals.
    """
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
        """
        Accepts an incoming WebSocket connection for an authenticated user and adds the connection to the game and per-user channel groups.
        
        If the connection's scope has no authenticated user (or the user is anonymous), the connection is closed. For authenticated users, this method:
        - extracts the `join_code` from the URL route,
        - initializes `self.game_group` and `self.user_group` group names,
        - adds the current channel to both groups on the channel layer,
        - accepts the WebSocket connection.
        
        Side effects:
        - May close the connection for anonymous users.
        - Mutates `self.join_code`, `self.game_group`, and `self.user_group`.
        - Registers the consumer's channel with the channel layer groups.
        """
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
        """
        Handle a WebSocket disconnection: remove the user's role instance from Redis, broadcast a leave event, and remove the channel from all groups.
        
        If this consumer has a join_code, the method:
        - Reads the user's role instance from the Redis hash `game_{join_code}_role_instances`; if present, deletes that entry and broadcasts a message of channel "users" and action "leave" with the role instance as data to the game group.
        - Removes the channel from the main game group, the per-user group, and any channel/transfer groups tracked on the instance.
        
        Parameters:
            close_code (int): WebSocket close code supplied by the framework (not used except for signature compatibility).
        
        Returns:
            None
        """
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
        Handle incoming WebSocket text messages: parse the JSON payload, dispatch to a dynamic handler, and optionally broadcast the result to a channel layer group.
        
        Expected incoming JSON shape:
        {
            "channel": "<logical channel name, e.g. 'communications', 'points', 'timer', 'users'>",
            "action": "<action name, e.g. 'send', 'start', 'move'>",
            "data": { ... }   # payload passed to the handler
        }
        
        Behavior:
        - Parses text_data into an event and builds a handler name of the form `handle_{channel}_{action}`.
        - If a corresponding coroutine method exists on the consumer, it is awaited with `data` and must return a tuple (target_group, send_data).
        - If no handler exists, the original event is broadcast to the consumer's `game_group`.
        - When broadcasting, sends a group message with type `"handle.message"` and payload fields: `channel`, `action`, and `data` (the handler-returned or original data).
        
        Notes:
        - Handlers control destination by returning the target group name (or None to suppress sending); they are responsible for validating permissions and membership.
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
        Forward a group-dispatched event to the WebSocket client as JSON.
        
        The incoming `event` must be a mapping containing the keys "channel", "action", and "data". This method sends a JSON message to the connected client with the shape:
        {
          "channel": <string>,
          "action": <string>,
          "data": <object>
        }
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
        Return the current set of role instances for the game and target the caller's per-user group.
        
        Ignores the incoming `data`. Reads the Redis hash `game_{join_code}_role_instances`, parses each JSON value
        into Python objects, and returns the consumer's per-user group together with a list of role instance dictionaries.
        
        Returns:
            tuple: (target_group, data) where `target_group` is the consumer's `self.user_group` and `data` is a
            list of role instance dicts.
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
        Register the current user as joined in the game, add them to computed channel and transfer groups, and persist their role instance in Redis.
        
        Validates that `data` represents the calling user (data["user"]["username"] must match scope user) and that the user has not already joined; on success it:
        - computes channel groups and transfer groups for the user's role instance,
        - subscribes the consumer's channel to those groups on the channel layer,
        - stores the role instance JSON under the Redis hash key `game_{join_code}_role_instances`.
        
        Parameters:
            data (dict): RoleInstance-like mapping representing the joining user's state; must include a `user` mapping with a `username` key and the fields used by group-computation helpers.
        
        Returns:
            tuple: (target_group, data) where `target_group` is the game group (self.game_group) and `data` is the same mapping passed in.
        
        Raises:
            Exception: if the username in `data` does not match the connected user or if the user is already present in the game's Redis role instances.
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
        self.transfer_groups = get_user_transfer_groups(self.join_code, teams, roles, data)
        for group in self.transfer_groups:
            await self.channel_layer.group_add(group, self.channel_name)

        redis_client.hset(role_key, user.id, json.dumps(data))

        return self.game_group, data


    async def handle_timer_get_finish_time(self, data):
        """
        Ensure a game timer exists and return the finish time to send to the caller.
        
        If no timer exists for the current join code, starts a 600-second timer (stored in Redis) and switches the broadcast target to the game group so the start is announced to all participants. Always sets data["finish_time"] to the integer timestamp when the timer will finish.
        
        Parameters:
            data (dict): Mutable message payload that will be augmented with a "finish_time" integer UNIX timestamp.
        
        Returns:
            tuple: (target_group (str), data (dict)) where target_group is either the per-user group or the game group depending on whether the timer was just created.
        """
        target_group = self.user_group

        timer_key = f"game_{self.join_code}_timer"
        redis_client = get_redis_client()

        if not redis_client.exists(timer_key):
            target_group = self.game_group

            expires_at = int(time.time()) + 600
            redis_client.set(timer_key, expires_at)

            username = self.scope["user"].username
            print(f"{username} started {self.join_code}'s timer (ends at {expires_at}).")

        data["finish_time"] = int(redis_client.get(timer_key))
        return target_group, data


    async def handle_role_instances_delete(self, data):
        """
        Return the target per-user game group for deleting a role instance.
        
        Expects `data` to be a mapping representing a RoleInstance payload containing an `"id"` field
        (the recipient user's id). Raises an Exception if `"id"` is missing.
        
        Returns:
            tuple: (target_group, data) where `target_group` is the string
            "game_{join_code}_user_{recipient_id}" aimed at the recipient's per-user group.
        """
        recipient_id = data.get("id")
        if not recipient_id:
            user= self.scope["user"]
            raise Exception(f"{user.username} did not provide the id of the user whose role they're deleting.")
        target_group = f"game_{self.join_code}_user_{recipient_id}"
        return target_group, data


    async def handle_communications_send(self, data):
        """
        Compute and return the channel group name for a communications message and validate sender membership.
        
        Expects `data` to contain:
        - "sender_role_instance": an object with ["team_instance"]["team"]["name"] and ["role"]["name"].
        - "recipient_team_name" and "recipient_role_name": strings.
        - "role_instance": used only for the username in error messages (["user"]["username"]).
        
        Returns:
            tuple[str, dict]: (target_group, data) where `target_group` is the channel group name
            in the form `game_{join_code}_channel_{A}_{B}` (A and B are the two endpoint identifiers
            sorted lexicographically, with spaces removed).
        
        Raises:
            Exception: if the computed target group is not present in self.channel_groups.
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
            raise Exception(f"User {data['role_instance']['user']['username']} on team {sender_team_name} with role {sender_role_name} is not in group {target_group}")

        return target_group, data
    
    async def handle_points_send(self, data):
        """
        Validate and route a points-send request to the appropriate transfer group.
        
        Expects `data` to be a dict containing:
        - "sender_role_instance": object with nested "team_instance" -> "team" -> "name" and "role" -> "name".
        - "recipient_team_name" (str) and "recipient_role_name" (str).
        - "role_instance" with "user" -> "username" (used only for error messages).
        
        Constructs the transfer group name:
          game_{join_code}_transfer_{senderTeam}{senderRole}_{recipientTeam}{recipientRole}
        (with spaces removed), verifies the current WebSocket connection is a member of that group, and returns (target_group, data).
        
        Returns:
            tuple[str, dict]: (target_group_name, original data)
        
        Raises:
            Exception: if the computed transfer group is not present in self.transfer_groups.
        """
        sender_team_name = data["sender_role_instance"]["team_instance"]["team"]["name"]
        sender_role_name = data["sender_role_instance"]["role"]["name"]

        recipient_team_name = data["recipient_team_name"]
        recipient_role_name = data["recipient_role_name"]

        target_group = f"game_{self.join_code}_transfer_{sender_team_name}{sender_role_name}_{recipient_team_name}{recipient_role_name}".replace(" ", "")

        if target_group not in self.transfer_groups:
            raise Exception(f"User {data['role_instance']['user']['username']} on team {sender_team_name} with role {sender_role_name} is not in group {target_group}")

        return target_group, data
    
    async def handle_points_spend(self, data):
        """
        Compute the channel group for spending supply points and validate the caller's membership.
        
        Expects `data` to contain:
            - team_name (str): name of the sender's team.
            - role_name (str): name of the sender's role.
            - supply_points (int|float): number of points to spend (passed through; not validated here).
        
        Returns:
            A tuple (target_group, data) where `target_group` is the channel group name to which the spend event should be sent.
        
        Raises:
            Exception: if the computed channel group is not present in `self.channel_groups` (i.e., the caller is not a member of the target channel).
        """
        sender_team_name = data["team_name"]
        sender_role_name = data["role_name"]

        target_group = f"game_{self.join_code}_channel_{sender_team_name}{sender_role_name}_{sender_team_name}{sender_role_name}".replace(" ", "")

        if target_group not in self.channel_groups:
            username = self.scope["user"].username
            raise Exception(f"User {username} on team {sender_team_name} with role {sender_role_name} is not in group {target_group}")

        return target_group, data


# ---------------- #
# Redis helpers    #
# ---------------- #
def get_redis_client():
    """
    Return a synchronous Redis client suitable for read/write operations.
    
    Obtains the underlying cache client from Django's cache backend with write access.
    
    Returns:
        redis.Redis: a synchronous Redis client instance.
    """
    return cache.client.get_client(write=True)

# -------------------- #
# helper functions     #
# -------------------- #
def get_user_channel_groups(join_code, teams, roles, role_instance):
    """
    Compute the sorted list of channel group names the given user should belong to for in-game communications.
    
    This builds per-game channel identifiers of the form `game_{join_code}_channel_{teamRole1}_{teamRole2}` based on the user's role and team and on the supplied collections of teams and roles. Special role behaviours are applied for Gamemaster, Ambassador, Combatant Commander, Chief of Staff, Commander, and Vice Commander to determine which team/role pairs the user must be grouped with. Team and role names have spaces removed when composing the final group strings.
    
    Parameters:
        join_code (str): Game join code used as the prefix for group names.
        teams (iterable): Iterable of Team-like objects with a `name` attribute.
        roles (iterable): Iterable of Role-like objects with at least `name`, boolean flags (`is_chief_of_staff`, `is_commander`, `is_vice_commander`), and a `branch.name` attribute.
        role_instance (dict): The user's role instance data structure (expected keys: `role` with `name`, flags, and `branch.name`, and `team_instance` with nested `team.name`).
    
    Returns:
        list[str]: Sorted list of channel group name strings the user should be added to.
    """
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
    """
    Compute Redis channel names for transfer groups this user can send to or receive from.
    
    Given a game join code, lists of Team and Role model-like objects, and the user's role instance (a dict containing at least
    "role" and "team_instance" -> "team"), return the normalized group names that represent allowed transfer directions.
    
    Parameters:
        join_code (str): Game join code used as the prefix in generated group names.
        teams (iterable): Iterable of team-like objects with a `name` attribute.
        roles (iterable): Iterable of role-like objects with attributes used by the logic (e.g., `name`, `is_chief_of_staff`,
            `is_commander`, `is_vice_commander`, `is_logistics`, and `branch.name`).
        role_instance (dict): The user's role instance containing at least:
            - role: dict-like with keys `name`, `is_chief_of_staff`, `is_commander`, `is_vice_commander`, `is_logistics`, and `branch` (which has `name`)
            - team_instance: dict-like with key `team` which has `name`
    
    Returns:
        list[str]: Sorted list of transfer group names of the form
            "game_{join_code}_transfer_{senderTeam}{senderRole}_{receiverTeam}{receiverRole}"
        Notes:
        - Whitespace is removed from team and role names in the generated group strings.
        - The returned list concatenates sorted "transfer to" groups (where this user can send) followed by sorted
          "transfer from" groups (where this user can receive).
        - Only combinations derived from the provided `teams` and `roles` iterables are considered.
    """
    user_role_name = role_instance["role"]["name"]
    user_team_name = role_instance["team_instance"]["team"]["name"]
    gamemaster_team_name = "Gamemasters"

    transfer_to_groups = []
    transfer_from_groups = []

    if user_role_name == "Gamemaster":
        transfer_to_groups += [(t.name, r.name) for r in roles if r.name != "Gamemaster" for t in teams if t.name != gamemaster_team_name]

    if user_role_name == "Combatant Commander":
        transfer_to_groups += [(user_team_name, r.name) for r in roles if r.is_chief_of_staff]
        transfer_from_groups += [(gamemaster_team_name, "Gamemaster")]

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
