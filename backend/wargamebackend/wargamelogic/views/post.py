from django.http import JsonResponse
from django.shortcuts import get_object_or_404, get_list_or_404
from django.db import IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import json
from ..models.static import (
    Team, Role, Unit, Tile
)
from ..models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, UnitInstance
)
from ..check_roles import (
    require_role_instance, require_any_role_instance
)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_game_instance(request):

    # Step 1: Create the GameInstance
    join_code = request.data.get("join_code")
    if not join_code:
        return Response(
            {"error": "join_code is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if GameInstance.objects.filter(join_code=join_code).exists():
        return Response(
            {"error": f"GameInstance with join_code '{join_code}' already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    game_instance = GameInstance.objects.create(join_code=join_code)

    # Step 2: Create TeamInstances for all Teams
    team_instances = []
    for team in Team.objects.all():
        team_instance = TeamInstance.objects.create(
            game_instance=game_instance,
            team=team
        )
        team_instances.append(team_instance)

    # Step 3: Assign GameMaster role to requesting user
    gamemaster_role = Role.objects.get(name="Gamemaster")
    gamemaster_team = Team.objects.get(name="Gamemasters")
    gamemaster_team_instance = TeamInstance.objects.get(
        game_instance=game_instance,
        team=gamemaster_team
    )

    RoleInstance.objects.create(
        team_instance=gamemaster_team_instance,
        role=gamemaster_role,
        user=request.user,
        supply_points=100000
    )

    # Step 4 (optional for later): Create LandmarkInstances

    return Response(
        {
            "message": "Game instance created successfully",
            "join_code": game_instance.join_code,
            "gamemaster": request.user.username
        },
        status=status.HTTP_201_CREATED
    )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_game_instance(request):
    if request.method == "POST":
        join_code = request.POST.get("join_code")
        try:
            game_instance = GameInstance.objects.get(join_code=join_code)
        except GameInstance.DoesNotExist:
            return JsonResponse({"error": "Invalid join code"}, status=400)

        request.user.game_instance = game_instance
        request.user.save()

        return JsonResponse({"status": "success"})
    
# any user can create a role for themselves for any game,
# but they cannot create a gamemaster role for a game that already has a gamemaster,
# and they cannot create multiple roles for themselves in the same game.
# if they want to change their role, a gamemaster or admin must do it.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_role_instance(request):
    """
    body: {
        join_code: String,
        team_name: String
        role_name: String,
    }
    """
    if request.method == 'POST':
        try:
            join_code = request.data.get('join_code')
            team_name = request.data.get('team_name')
            role_name = request.data.get('role_name')

            if not join_code or not team_name or not role_name:
                return JsonResponse({'error': 'Missing join_code or team or role'}, status=400)

            try:
                role = Role.objects.get(name=role_name)
            except Role.DoesNotExist:
                return JsonResponse({'error': f'Role not found: {role_name}'}, status=404)

            try:
                team = Team.objects.get(name=team_name)
            except Team.DoesNotExist:
                return JsonResponse({'error': f'Team not found: {team_name}'}, status=404)

            try:
                game_instance = GameInstance.objects.get(join_code=join_code)
            except GameInstance.DoesNotExist:
                return JsonResponse({'error': f'GameInstance not found with join code: {join_code}'}, status=404)

            try:
                team_instance = TeamInstance.objects.get(game_instance=game_instance, team=team)
            except TeamInstance.DoesNotExist:
                return JsonResponse({'error': f'TeamInstance not found for team "{team_name}" in game "{join_code}"'}, status=404)

            if role.name == "Gamemaster":
                if RoleInstance.objects.filter(
                    team_instance__game_instance=game_instance,
                    role__name="Gamemaster"
                ).exists():
                    return JsonResponse({'error': 'This game already has a Gamemaster'}, status=400)

            # Check if the user already has a role in this game
            if RoleInstance.objects.filter(
                team_instance__game_instance=game_instance,
                user=request.user
            ).exists():
                return JsonResponse({'error': f'User {request.user.username} already has a role in this game'}, status=400)

            RoleInstance.objects.create(
                team_instance=team_instance,
                role=role,
                user=request.user,
            )

            print(f"[Backend] Role registered: {role_name} for team: {team_name} by user: {request.user.username}")
            return JsonResponse({'status': 'ok', 'role': role_name, 'team': team_name}, status=201)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid method'}, status=405)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        'team_instance.game_instance.join_code': lambda request, kwargs: request.data.get("join_code"),
        'role.name': 'Gamemaster'
    },
    {
        'team_instance.game_instance.join_code': lambda request, kwargs: request.data.get("join_code"),
        'team_instance.team.name': lambda request, kwargs: request.data.get("team_name"),
    }
])
def create_unit_instance(request):
    join_code = request.data.get("join_code")
    team_name = request.data.get("team_name")
    unit_name = request.data.get("unit_name")
    row = request.data.get("row")
    column = request.data.get("column")

    if not all([join_code, team_name, unit_name, row, column]):
        return Response(
            {"detail": "Missing required fields."},
            status=status.HTTP_400_BAD_REQUEST
        )

    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    team_instance = get_object_or_404(
        TeamInstance, game_instance=game_instance, team__name=team_name
    )
    unit = get_object_or_404(Unit, name=unit_name)
    tile = get_object_or_404(Tile, row=row, column=column, game_instance=game_instance)

    # find the RoleInstance for this user in this team_instance
    try:
        role_instance = RoleInstance.objects.get(team_instance=team_instance, user=request.user)
    except RoleInstance.DoesNotExist:
        return Response(
            {"detail": "You are not part of this team."},
            status=status.HTTP_403_FORBIDDEN
        )

    if role_instance.supply_points < unit.cost:
        return Response(
            {"detail": "Not enough supply points to purchase this unit."},
            status=status.HTTP_400_BAD_REQUEST
        )

    role_instance.supply_points -= unit.cost
    role_instance.save()

    unit_instance = UnitInstance.objects.create(
        team_instance=team_instance,
        unit=unit,
        tile=tile,
        health=unit.max_health,
        supply_count=unit.max_supply_space,
    )

    return Response(
        {
            "id": unit_instance.id,
            "team": team_instance.team.name,
            "unit": unit.name,
            "tile": {"row": tile.row, "column": tile.column},
            "health": unit_instance.health,
            "supply_count": unit_instance.supply_count,
            "remaining_supply_points": role_instance.supply_points,
        },
        status=status.HTTP_201_CREATED
    )