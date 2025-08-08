
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, get_list_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from ..models.static import (
  Team, Role, Unit, Attack, Ability, Landmark, Tile
)
from ..models.dynamic import (
  GameInstance, TeamInstance, RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)
from ..serializers import (
    TeamSerializer,
    RoleSerializer,
    RoleInstanceSerializer,
    UnitSerializer,
    UnitInstanceSerializer,
    AttackSerializer,
    AbilitySerializer,
    LandmarkSerializer,
    TeamInstanceSerializer,
    LandmarkInstanceSerializer,
    TileSerializer,
)
from ..game_logic import *

def main_map(request):
    return JsonResponse({"message": "Hello from Django view!"})

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
def get_game_team_instances_by_name(request, join_code, team_name):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    serializer = TeamInstanceSerializer(team_instance)
    return Response(serializer.data)

@api_view(['GET'])
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
@permission_classes([IsAuthenticated])
def get_game_unit_instances_by_team_name(request, join_code, team_name):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    unit_instances = UnitInstance.objects.filter(team_instance=team_instance)
    serializer = UnitInstanceSerializer(unit_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_unit_instances_by_team_name_and_domain(request, join_code, team_name, domain):
    valid_domains = [d[0] for d in Unit.DOMAINS]
    if domain not in valid_domains:
        return Response({'error': f'Invalid domain: {domain}. Must be one of {valid_domains}'}, status=status.HTTP_400_BAD_REQUEST)
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team = get_object_or_404(Team, name=team_name)
    team_instance = get_object_or_404(TeamInstance, game_instance=game_instance, team=team)
    unit_instances = UnitInstance.objects.filter(team_instance=team_instance, unit__domain=domain)
    serializer = UnitInstanceSerializer(unit_instances, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_game_unit_instances(request, join_code):
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    unit_instances = UnitInstance.objects.filter(team_instance__game_instance=game_instance)
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