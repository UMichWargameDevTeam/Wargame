from django.shortcuts import get_object_or_404, get_list_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from auth.authentication import CookieJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from wargamelogic.models.static import (
    Team, Role, Unit, Attack, Ability, Landmark, Tile
)
from wargamelogic.models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, TeamInstanceRolePoints, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)
from wargamelogic.serializers import (
    TeamSerializer, RoleSerializer, UnitSerializer, AttackSerializer, AbilitySerializer, LandmarkSerializer, TileSerializer,
    GameInstanceSerializer, TeamInstanceSerializer, RoleInstanceSerializer, TeamInstanceRolePointsSerializer, UnitInstanceSerializer, LandmarkInstanceSerializer,
)
from auth.authorization import (
    require_role_instance, require_any_role_instance
)


@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def main_map(request, join_code):
    return Response({"message": "Hello from Django view!"}, status=status.HTTP_200_OK)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def validate_map_access(request, join_code):
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
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_team_by_name(request, name):
    team = get_object_or_404(Team, name=name)
    serializer = TeamSerializer(team)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_role_by_name(request, name):
    role = get_object_or_404(Role, name=name)
    serializer = RoleSerializer(role)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_unit_by_name(request, unit_name):
    unit = get_object_or_404(Unit, name=unit_name)
    serializer = UnitSerializer(unit)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_attack_by_unit_and_name(request, unit_name, attack_name):
    unit = get_object_or_404(Unit, name=unit_name)
    attack = get_object_or_404(Attack, unit=unit, name=attack_name)
    serializer = AttackSerializer(attack)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_ability_by_unit_and_name(request, unit_name, ability_name):
    unit = get_object_or_404(Unit, name=unit_name)
    ability = get_object_or_404(Ability, unit=unit, name=ability_name)
    serializer = AbilitySerializer(ability)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_landmark_by_name(request, name):
    landmark = get_object_or_404(Landmark, name=name)
    serializer = LandmarkSerializer(landmark)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_tile_by_coords(request, row, column):
    tile = get_object_or_404(Tile, row=row, column=column)
    serializer = TileSerializer(tile)
    return Response(serializer.data)

# GET dynamic table data
@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_game_by_join_code(request, join_code):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    serializer = GameInstanceSerializer(game_instance)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_game_team_instance_by_name(request, join_code, team_name):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    serializer = TeamInstanceSerializer(team_instance)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_game_role_instances(request, join_code):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    role_instances = get_list_or_404(RoleInstance, team_instance__game_instance=game_instance)
    serializer = RoleInstanceSerializer(role_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_game_role_instances_by_team(request, join_code, team_name):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    role_instances = get_list_or_404(RoleInstance, team_instance=team_instance)
    serializer = RoleInstanceSerializer(role_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_game_role_instances_by_team_and_role(request, join_code, team_name, role_name):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    role = get_object_or_404(Role, name=role_name)
    role_instances = get_list_or_404(RoleInstance, team_instance=team_instance, role=role)
    serializer = RoleInstanceSerializer(role_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_game_team_instance_role_points(request, join_code, team_name, role_name):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    role = get_object_or_404(Role, name=role_name)
    team_instance_role_points = get_object_or_404(TeamInstanceRolePoints, team_instance=team_instance, role=role)
    serializer = TeamInstanceRolePointsSerializer(team_instance_role_points)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role_instance({
    'team_instance.game_instance.join_code': lambda request, kwargs: kwargs['join_code']
})
def get_game_unit_instances(request, join_code):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    unit_instances = UnitInstance.objects.filter(team_instance__game_instance=game_instance)
    serializer = UnitInstanceSerializer(unit_instances, many=True)
    return Response(serializer.data)

# may remove this view if it's unnecessary or modify who can access it
@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
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
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    unit_instances = UnitInstance.objects.filter(team_instance=team_instance)
    serializer = UnitInstanceSerializer(unit_instances, many=True)
    return Response(serializer.data)

# may remove this view if it's unnecessary or modify who can access it
@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
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
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_game_tiles_for_landmark_instance_by_id(request, pk):
    landmark_instance = get_object_or_404(LandmarkInstance, pk=pk)
    landmark_instance_tiles = get_list_or_404(LandmarkInstanceTile, landmark_instance=landmark_instance)
    tiles = [lit.tile for lit in landmark_instance_tiles]
    serializer = TileSerializer(tiles, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@authentication_classes([CookieJWTAuthentication])
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