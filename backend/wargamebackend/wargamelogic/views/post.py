from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models.static import (
    Team, Role, Unit, Tile
)
from ..models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, UnitInstance
)
from ..check_roles import (
    require_any_role_instance
)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_game_instance(request):
    join_code = request.data.get("join_code")
    if not join_code:
        return Response({"error": "join_code is required."}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(join_code.trim()) < 1:
        return Response({"detail": "join_code must contain least one non-whitespace character."}, status=status.HTTP_400_BAD_REQUEST)

    if GameInstance.objects.filter(join_code=join_code).exists():
        return Response({"detail": f"GameInstance with join_code '{join_code}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

    # Step 1: Create GameInstance
    game_instance = GameInstance.objects.create(join_code=join_code)

    # Step 2: Create all TeamInstances in bulk
    teams = list(Team.objects.all())
    team_instances = [
        TeamInstance(game_instance=game_instance, team=team)
        for team in teams
    ]
    TeamInstance.objects.bulk_create(team_instances)

    # Step 3: Fetch Gamemaster team + role in one query each
    gamemaster_role = get_object_or_404(Role, name="Gamemaster")
    gamemaster_team = get_object_or_404(Team, name="Gamemasters")

    # Instead of re-querying TeamInstance, pull it from the bulk we just created
    gamemaster_team_instance = TeamInstance.objects.get(
        game_instance=game_instance,
        team=gamemaster_team,
    )

    RoleInstance.objects.create(
        team_instance=gamemaster_team_instance,
        role=gamemaster_role,
        user=request.user,
        supply_points=100000
    )

    return Response(
        {
            "username": request.user.username,
            "join_code": join_code,
            "team_name": gamemaster_team.name,
            "branch_name": gamemaster_role.branch.name if gamemaster_role.branch else None,
            "role_name": gamemaster_role.name,
        },
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_game_instance(request):

    join_code = request.data.get("join_code")
    if not join_code:
        return Response({"error": "Missing join_code"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        game_instance = GameInstance.objects.get(join_code=join_code)
    except GameInstance.DoesNotExist:
        return Response({"error": f"GameInstance not found with join code: {join_code}"}, status=status.HTTP_404_NOT_FOUND)

    request.user.game_instance = game_instance
    request.user.save(update_fields=["game_instance"])

    return Response(status=status.HTTP_200_OK)
    

# any user can create a role for themselves for any game,
# but they cannot create a gamemaster role for a game that already has a gamemaster,
# and they cannot create multiple roles for themselves in the same game.
# if they want to change their role, a gamemaster or admin must do it.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_role_instance(request):
    join_code = request.data.get('join_code')
    team_name = request.data.get('team_name')
    role_name = request.data.get('role_name')

    if not join_code:
        return Response({"error": "Missing join_code"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        game_instance = GameInstance.objects.get(join_code=join_code)
    except GameInstance.DoesNotExist:
        return Response({"error": f"GameInstance not found with join code: {join_code}"}, status=status.HTTP_404_NOT_FOUND)

    # Check if user already has a role (select_related reduces hits)
    existing_role_instance = RoleInstance.objects.filter(
        team_instance__game_instance=game_instance,
        user=request.user
    ).select_related("team_instance__team", "role__branch").first()

    if existing_role_instance:
        return Response(
            {
                "username": request.user.username,
                "join_code": join_code,
                "team_name": existing_role_instance.team_instance.team.name,
                "branch_name": existing_role_instance.role.branch.name if existing_role_instance.role.branch else None,
                "role_name": existing_role_instance.role.name,
            },
            status=status.HTTP_200_OK
        )

    # Resolve Team and Role in parallel
    try:
        team = Team.objects.get(name=team_name)
    except Team.DoesNotExist:
        return Response({"error": f"Team not found: {team_name}"}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        role = Role.objects.select_related("branch").get(name=role_name)
    except Role.DoesNotExist:
        return Response({"error": f"Role not found: {role_name}"}, status=status.HTTP_404_NOT_FOUND)

    try:
        team_instance = TeamInstance.objects.get(game_instance=game_instance, team=team)
    except TeamInstance.DoesNotExist:
        return Response({"error": f"TeamInstance not found for team '{team_name}' in game '{join_code}'"}, status=status.HTTP_404_NOT_FOUND)

    # Gamemaster uniqueness check
    if role.name == "Gamemaster" and RoleInstance.objects.filter(
        team_instance__game_instance=game_instance,
        role__name="Gamemaster"
    ).exists():
        return Response({"detail": "This game already has a Gamemaster"}, status=status.HTTP_400_BAD_REQUEST)

    RoleInstance.objects.create(
        team_instance=team_instance,
        role=role,
        user=request.user,
    )

    return Response(
        {
            "username": request.user.username,
            "join_code": join_code,
            "team_name": team.name,
            "branch_name": role.branch.name if role.branch else None,
            "role_name": role.name,
        },
        status=status.HTTP_201_CREATED
    )

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
        return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

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
        return Response({"detail": "You are not part of this team."}, status=status.HTTP_403_FORBIDDEN)

    if role_instance.supply_points < unit.cost:
        return Response({"detail": "Not enough supply points to purchase this unit."}, status=status.HTTP_400_BAD_REQUEST)

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