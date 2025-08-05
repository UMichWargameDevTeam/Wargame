
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.decorators import api_view
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

import json

@csrf_exempt
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
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

class RoleInstanceViewSet(viewsets.ModelViewSet):
    queryset = RoleInstance.objects.all()
    serializer_class = RoleInstanceSerializer

class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class UnitInstanceViewSet(viewsets.ModelViewSet):
    queryset = UnitInstance.objects.all()
    serializer_class = UnitInstanceSerializer

class AttackViewSet(viewsets.ModelViewSet):
    queryset = Attack.objects.all()
    serializer_class = AttackSerializer

class AbilityViewSet(viewsets.ModelViewSet):
    queryset = Ability.objects.all()
    serializer_class = AbilitySerializer

class LandmarkViewSet(viewsets.ModelViewSet):
    queryset = Landmark.objects.all()
    serializer_class = LandmarkSerializer

class LandmarkInstanceViewSet(viewsets.ModelViewSet):
    queryset = LandmarkInstance.objects.all()
    serializer_class = LandmarkInstanceSerializer

class TileViewSet(viewsets.ModelViewSet):
    queryset = Tile.objects.all()
    serializer_class = TileSerializer

class LandmarkInstanceTileViewSet(viewsets.ModelViewSet):
    queryset = LandmarkInstanceTile.objects.all()
    serializer_class = LandmarkInstanceTileSerializer