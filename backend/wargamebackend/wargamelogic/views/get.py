from django.shortcuts import get_object_or_404, get_list_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from wargamelogic.models.static import (
    Team, Role, Unit, Attack, Ability, Landmark, Tile
)
from wargamelogic.models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, TeamInstanceRolePoints, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)
from wargamelogic.serializers import (
    TeamSerializer, RoleSerializer, UnitSerializer, AttackSerializer, AbilitySerializer, LandmarkSerializer, TileSerializer,
    TeamInstanceSerializer, RoleInstanceSerializer, TeamInstanceRolePointsSerializer, UnitInstanceSerializer, LandmarkInstanceSerializer,
)
from wargamelogic.check_roles import (
    require_role_instance, require_any_role_instance
)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def main_map(request, join_code):
    """
    Return a simple JSON greeting for the map endpoint.
    
    Parameters:
        join_code (str): Game join code from the URL path; included to match the endpoint signature.
    
    Returns:
        rest_framework.response.Response: HTTP 200 with body {"message": "Hello from Django view!"}.
    """
    return Response({"message": "Hello from Django view!"}, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def validate_map_access(request, join_code):
    """
    Validate that the requesting user has a RoleInstance in the game identified by join_code and return that RoleInstance serialized.
    
    If a GameInstance with the given join_code does not exist, returns a 404 Response with an error message.
    If the requesting user does not have a RoleInstance in the found game, returns a 403 Response with an error message.
    On success, returns a 200 Response containing the serialized RoleInstance.
    
    Parameters:
        join_code (str): Game join code used to locate the GameInstance.
    """
    try:
        game_instance = GameInstance.objects.get(join_code=join_code)
    except GameInstance.DoesNotExist:
        return Response({"error": f"There is no game with Join Code '{join_code}'"}, status=status.HTTP_404_NOT_FOUND)

    try:
        role_instance = RoleInstance.objects.get(team_instance__game_instance=game_instance, user=request.user)
    except RoleInstance.DoesNotExist:
        return Response({"error": f"You do not have a role in the game '{join_code}'"}, status=status.HTTP_403_FORBIDDEN)
    
    serializer = RoleInstanceSerializer(role_instance)
    return Response(serializer.data, status=status.HTTP_200_OK)

# GET static table data

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_by_name(request, name):
    team = get_object_or_404(Team, name=name)
    serializer = TeamSerializer(team)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role_by_name(request, name):
    role = get_object_or_404(Role, name=name)
    serializer = RoleSerializer(role)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unit_by_name(request, unit_name):
    unit = get_object_or_404(Unit, name=unit_name)
    serializer = UnitSerializer(unit)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attack_by_unit_and_name(request, unit_name, attack_name):
    unit = get_object_or_404(Unit, name=unit_name)
    attack = get_object_or_404(Attack, unit=unit, name=attack_name)
    serializer = AttackSerializer(attack)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ability_by_unit_and_name(request, unit_name, ability_name):
    unit = get_object_or_404(Unit, name=unit_name)
    ability = get_object_or_404(Ability, unit=unit, name=ability_name)
    serializer = AbilitySerializer(ability)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_landmark_by_name(request, name):
    landmark = get_object_or_404(Landmark, name=name)
    serializer = LandmarkSerializer(landmark)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tile_by_coords(request, row, column):
    tile = get_object_or_404(Tile, row=row, column=column)
    serializer = TileSerializer(tile)
    return Response(serializer.data)

# GET dynamic table data

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_team_instance_by_name(request, join_code, team_name):
    """
    Return the TeamInstance for a team within a game identified by join_code.
    
    Retrieves the GameInstance by join_code and the Team by team_name, then returns the serialized TeamInstance (the team's participation/configuration) for that game.
    
    Parameters:
        join_code (str): Join code of the game.
        team_name (str): Name of the team.
    
    Returns:
        dict: Serialized TeamInstance data suitable for a JSON response.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    serializer = TeamInstanceSerializer(team_instance)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_role_instances(request, join_code):
    """
    Return all RoleInstance records for the game identified by join_code.
    
    Retrieves the GameInstance matching join_code and returns a serialized list of RoleInstance objects associated with that game's TeamInstances.
    
    Parameters:
        join_code (str): Join code of the game whose role instances should be returned.
    
    Returns:
        rest_framework.response.Response: DRF Response containing a JSON array of serialized RoleInstance objects.
    
    Raises:
        django.http.Http404: If the GameInstance does not exist or no RoleInstance objects are found for that game.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    role_instances = get_list_or_404(RoleInstance, team_instance__game_instance=game_instance)
    serializer = RoleInstanceSerializer(role_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_role_instances_by_team(request, join_code, team_name):
    """
    Return all RoleInstance objects for a given team within a specific game.
    
    Retrieves the GameInstance by join_code, the Team by team_name, and the corresponding TeamInstance,
    then returns a serialized list of RoleInstance objects for that TeamInstance as a DRF Response.
    
    Parameters:
        join_code (str): Join code identifying the GameInstance.
        team_name (str): Name of the Team whose role instances should be returned.
    
    Returns:
        rest_framework.response.Response: Serialized list of RoleInstance objects (JSON).
    
    Raises:
        Http404: If the GameInstance, Team, TeamInstance, or any RoleInstance objects are not found.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    role_instances = get_list_or_404(RoleInstance, team_instance=team_instance)
    serializer = RoleInstanceSerializer(role_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_role_instances_by_team_and_role(request, join_code, team_name, role_name):
    """
    Return all RoleInstance objects for a specific team and role within a game, serialized for a DRF response.
    
    Given a game identified by join_code, a team name, and a role name, this view looks up the corresponding GameInstance, Team, TeamInstance, and Role, then returns the list of RoleInstance objects for that team_instance and role as serialized JSON.
    
    Parameters:
        join_code (str): Join code identifying the GameInstance.
        team_name (str): Name of the Team within the game.
        role_name (str): Name of the Role to filter RoleInstance objects.
    
    Returns:
        rest_framework.response.Response: HTTP 200 response containing a list of serialized RoleInstance objects.
    
    Behavior:
        - Returns HTTP 404 if the GameInstance, Team, TeamInstance, Role, or any matching RoleInstance objects are not found.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    role = get_object_or_404(Role, name=role_name)
    role_instances = get_list_or_404(RoleInstance, team_instance=team_instance, role=role)
    serializer = RoleInstanceSerializer(role_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_team_instance_role_points(request, join_code, team_name, role_name):
    """
    Retrieve the TeamInstanceRolePoints for a given game, team, and role.
    
    Looks up GameInstance by join_code, Team by team_name, the corresponding TeamInstance, and Role by role_name,
    then returns the serialized TeamInstanceRolePoints for that team-instance/role combination.
    
    Parameters:
        request: The HTTP request (unused for lookup; required by view signature).
        join_code (str): Join code identifying the GameInstance.
        team_name (str): Name of the Team.
        role_name (str): Name of the Role.
    
    Returns:
        Response: DRF Response containing the serialized TeamInstanceRolePoints.
    
    Raises:
        Http404: If the game instance, team, team instance, role, or team-instance role points are not found.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    role = get_object_or_404(Role, name=role_name)
    team_instance_role_points = get_object_or_404(TeamInstanceRolePoints, team_instance=team_instance, role=role)
    serializer = TeamInstanceRolePointsSerializer(team_instance_role_points)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_role_instance({
    'team_instance.game_instance.join_code': lambda request, kwargs: kwargs['join_code']
})
def get_game_unit_instances(request, join_code):
    """
    Retrieve all UnitInstance records for the game identified by join_code.
    
    Looks up the GameInstance with the given join_code (404 if not found) and returns a serialized list of UnitInstance objects whose team_instance is part of that game.
    
    Parameters:
        join_code (str): Join code of the game whose unit instances should be returned.
    
    Returns:
        rest_framework.response.Response: HTTP 200 response containing a JSON array of serialized UnitInstance objects.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    unit_instances = UnitInstance.objects.filter(team_instance__game_instance=game_instance)
    serializer = UnitInstanceSerializer(unit_instances, many=True)
    return Response(serializer.data)

# may remove this view if it's unnecessary or modify who can access it
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        'team_instance.game_instance.join_code': lambda request, kwargs: kwargs['join_code'],
        'role.name': 'Gamemaster'
    },
    {
        'team_instance.game_instance.join_code': lambda request, kwargs: kwargs['join_code'],
        'team_instance.team.name': lambda request, kwargs: kwargs['team_name'],
        'role.name':'Combatant Commander'
    }
])
def get_game_unit_instances_by_team_name(request, join_code, team_name):
    """
    Return a list of UnitInstance objects for the specified game join code and team name.
    
    Looks up the GameInstance by join_code, the Team by name, and the TeamInstance for that game/team, then returns the serialized UnitInstance queryset as a DRF Response. Raises Http404 if the game, team, or team instance does not exist.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    unit_instances = UnitInstance.objects.filter(team_instance=team_instance)
    serializer = UnitInstanceSerializer(unit_instances, many=True)
    return Response(serializer.data)

# may remove this view if it's unnecessary or modify who can access it
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        'team_instance.game_instance.join_code': lambda request, kwargs: kwargs['join_code'],
        'role.name': 'Gamemaster'
    },
    {
        'team_instance.game_instance.join_code': lambda request, kwargs: kwargs['join_code'],
        'team_instance.team.name': lambda request, kwargs: kwargs['team_name'],
        'role.branch.name': lambda request, kwargs: kwargs['branch'],
        'role.is_branch_commander': True
    }
])
def get_game_unit_instances_by_team_name_and_branch(request, join_code, team_name, branch):
    """
    Return serialized UnitInstance objects for a specific team in a game filtered by unit branch.
    
    Retrieves the GameInstance identified by join_code, the Team by team_name, and the TeamInstance for that game/team, then returns all UnitInstance records belonging to that TeamInstance whose related Unit has a branch with the given name. Raises Http404 if the game, team, or team instance (or no matching UnitInstances when using get_list_or_404) cannot be found.
    
    Parameters:
        join_code (str): GameInstance join code.
        team_name (str): Team.name to look up the team's TeamInstance within the game.
        branch (str): Name of the unit branch to filter UnitInstances by.
    
    Returns:
        rest_framework.response.Response: Serialized list of UnitInstance objects (JSON).
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    unit_instances = UnitInstance.objects.filter(
        team_instance=team_instance,
        unit__branches__name=branch
    )
    serializer = UnitInstanceSerializer(unit_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_tiles_for_landmark_instance_by_id(request, join_code, pk):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    landmark_instance = get_object_or_404(LandmarkInstance, pk=pk, game_instance=game_instance)
    landmark_instance_tiles = get_list_or_404(LandmarkInstanceTile, landmark_instance=landmark_instance)
    tiles = [lit.tile for lit in landmark_instance_tiles]
    serializer = TileSerializer(tiles, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_landmark_instances_for_tile_by_coords(request, join_code, row, column):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    tile = get_object_or_404(Tile, row=row, column=column)
    landmark_instance_tiles = get_list_or_404(
        LandmarkInstanceTile,
        tile=tile,
        landmark_instance__game_instance=game_instance
    )
    landmark_instances = [lit.landmark_instance for lit in landmark_instance_tiles]
    serializer = LandmarkInstanceSerializer(landmark_instances, many=True)
    return Response(serializer.data)