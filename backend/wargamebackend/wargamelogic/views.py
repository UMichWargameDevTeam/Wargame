
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework import viewsets
from .models.static import Team, Role, Unit, Attack, Ability, Landmark, Tile
from .models.dynamic import RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile
from .serializers import (
    TeamSerializer,
    RoleSerializer,
    RoleInstanceSerializer,
    UnitSerializer,
    UnitInstanceSerializer,
    AttackSerializer,
    AbilitySerializer,
    LandmarkSerializer,
    LandmarkInstanceSerializer,
    TileSerializer,
    LandmarkInstanceTileSerializer
)
from .game_logic import *
import json

@csrf_exempt
@permission_classes([IsAuthenticated])
def register_role(request):
    """
    body: {
        role: String,
        team: String
    }
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            role_name = data.get('role')
            team_name = data.get('team')

            if not role_name or not team_name:
                return JsonResponse({'error': 'Missing role or team name'}, status=400)

            try:
                role = Role.objects.get(name=role_name)
            except Role.DoesNotExist:
                return JsonResponse({'error': f'Role not found: {role_name}'}, status=404)

            try:
                team = Team.objects.get(name=team_name)
            except Team.DoesNotExist:
                return JsonResponse({'error': f'Team not found: {team_name}'}, status=404)

            # TODO: keep track of the user who registered for this role, 
            # and prevent multiple users from registering for the same role
            role_instance = RoleInstance.objects.create(role=role, team=team)

            print(f"[Backend] Role registered: {role_name} for team: {team_name}")
            return JsonResponse({'status': 'ok', 'role': role_name, 'team': team_name})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid method'}, status=405)

def main_map(request):
    return JsonResponse({"message": "Hello from Django view!"})

class TeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

class RoleInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = RoleInstance.objects.all()
    serializer_class = RoleInstanceSerializer

class UnitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class UnitInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = UnitInstance.objects.all()
    serializer_class = UnitInstanceSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()

        row = request.data.get("row")
        column = request.data.get("column")

        if row is not None and column is not None:
            tile, created = Tile.objects.get_or_create(
                row=row,
                column=column,
                defaults={"terrain": "Plains/Grasslands"}  # default
            )
            instance.tile = tile
            instance.save()

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        # Make PUT behave the same way
        return self.partial_update(request, *args, **kwargs)

class AttackViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Attack.objects.all()
    serializer_class = AttackSerializer

class AbilityViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Ability.objects.all()
    serializer_class = AbilitySerializer

class LandmarkViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Landmark.objects.all()
    serializer_class = LandmarkSerializer

class LandmarkInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LandmarkInstance.objects.all()
    serializer_class = LandmarkInstanceSerializer

class TileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Tile.objects.all()
    serializer_class = TileSerializer

class LandmarkInstanceTileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LandmarkInstanceTile.objects.all()
    serializer_class = LandmarkInstanceTileSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_by_name(request, name):
    try:
        team = Team.objects.get(name=name)
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = TeamSerializer(team)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role_by_name(request, name):
    try:
        role = Role.objects.get(name=name)
    except Role.DoesNotExist:
        return Response({"error": "Role not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = RoleSerializer(role)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unit_by_name(request, unit_name):
    try:
        unit = Unit.objects.get(name=unit_name)
    except Unit.DoesNotExist:
        return Response({"error": "Unit not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = UnitSerializer(unit)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attack_by_unit_and_name(request, unit_name, attack_name):
    try:
        unit = Unit.objects.get(name=unit_name)
        attack = unit.attacks.get(name=attack_name)
    except (Unit.DoesNotExist, Attack.DoesNotExist):
        return Response({"error": "Attack not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = AttackSerializer(attack)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ability_by_unit_and_name(request, unit_name, ability_name):
    try:
        unit = Unit.objects.get(name=unit_name)
        ability = unit.abilities.get(name=ability_name)
    except (Unit.DoesNotExist, Ability.DoesNotExist):
        return Response({"error": "Ability not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = AbilitySerializer(ability)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_landmark_by_name(request, name):
    try:
        landmark = Landmark.objects.get(name=name)
    except Landmark.DoesNotExist:
        return Response({"error": "Landmark not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = LandmarkSerializer(landmark)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_tile_by_coords(request, row, column):
    try:
        tile = Tile.objects.get(row=row, column=column)
    except Tile.DoesNotExist:
        return Response({"error": "Tile not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = TileSerializer(tile)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_role_instances_by_team_and_role(request, team_name, role_name):
    try:
        team = Team.objects.get(name=team_name)
        role = Role.objects.get(name=role_name)
        role_instances = RoleInstance.objects.filter(team=team, role=role)
    except (Team.DoesNotExist, Role.DoesNotExist):
        return Response({"error": "Team or Role not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if not role_instances.exists():
        return Response({"error": "No RoleInstances found"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = RoleInstanceSerializer(role_instances, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unit_instance_by_id(request, pk):
    try:
        unit_instance = UnitInstance.objects.get(id=pk)
    except UnitInstance.DoesNotExist:
        return Response({"error": "UnitInstance not found"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = UnitInstanceSerializer(unit_instance)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_landmark_instance_by_id(request, pk):
    try:
        landmark_instance = LandmarkInstance.objects.get(id=pk)
    except LandmarkInstance.DoesNotExist:
        return Response({"error": "LandmarkInstance not found"}, status=status.HTTP_404_NOT_FOUND)
    
    serializer = LandmarkInstanceSerializer(landmark_instance)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_landmark_instance_tile_by_coords(request, row, column):
    try:
        tile = Tile.objects.get(row=row, column=column)
        landmark_instance_tiles = LandmarkInstanceTile.objects.filter(tile=tile)
    except Tile.DoesNotExist:
        return Response({"error": "Tile not found"}, status=status.HTTP_404_NOT_FOUND)

    if not landmark_instance_tiles.exists():
        return Response({"error": "No LandmarkInstanceTiles found for this tile"}, status=status.HTTP_404_NOT_FOUND)

    serializer = LandmarkInstanceTileSerializer(landmark_instance_tiles, many=True)
    return Response(serializer.data)



# --------------------------- GAME LOGIC --------------------------- #
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_unit(request):
    unit_instance_id = request.data.get('unitId')
    target_row = request.data.get('targetRow')
    target_col = request.data.get('targetCol')

    if unit_instance_id is None or target_row is None or target_col is None:
        return JsonResponse({'error': 'Missing parameters'}, status=400)

    try:
        unit_instance = UnitInstance.objects.select_related('unit', 'tile', 'team').get(id=unit_instance_id)
    except UnitInstance.DoesNotExist:
        return JsonResponse({'error': 'UnitInstance not found'}, status=404)

    # TODO: Add team ownership validation if you want to ensure user controls this unit
    # e.g., if unit_instance.team.user != user: return JsonResponse(...)

    try:
        target_tile = Tile.objects.get(row=target_row, column=target_col)
    except Tile.DoesNotExist:
        return JsonResponse({'error': 'Target tile does not exist'}, status=404)

    success, message = move_unit_instance(unit_instance, target_tile)

    if not success:
        return JsonResponse({'error': message}, status=400)

    return JsonResponse({
        'status': 'moved',
        'new_position': {
            'row': target_tile.row,
            'column': target_tile.column,
        }
    })
