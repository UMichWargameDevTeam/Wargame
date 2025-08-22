from django.http import JsonResponse
from django.shortcuts import get_object_or_404, get_list_or_404
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
from ..models.static import (
    Team, Role, Tile
)
from ..models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, UnitInstance
)
from ..game_logic import (
    move_unit_instance
)
from ..check_roles import (
    require_role_instance, require_any_role_instance
)

# any user can create a role for themselves for any game,
# but they cannot create a gamemaster role for a game that already has a gamemaster,
# and they cannot create multiple roles for themselves in the same game.
# if they want to change their role, a gamemaster or admin must do it.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def register_role(request):
    """
    body: {
        join-code: String,
        role: String,
        team: String
    }
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            game_join_code = data.get('join-code')
            team_name = data.get('team')
            role_name = data.get('role')

            if not game_join_code or not team_name or not role_name:
                return JsonResponse({'error': 'Missing join-code or team or role'}, status=400)

            try:
                role = Role.objects.get(name=role_name)
            except Role.DoesNotExist:
                return JsonResponse({'error': f'Role not found: {role_name}'}, status=404)

            try:
                team = Team.objects.get(name=team_name)
            except Team.DoesNotExist:
                return JsonResponse({'error': f'Team not found: {team_name}'}, status=404)

            try:
                game_instance = GameInstance.objects.get(join_code=game_join_code)
            except GameInstance.DoesNotExist:
                return JsonResponse({'error': f'GameInstance not found with join code: {game_join_code}'}, status=404)

            try:
                team_instance = TeamInstance.objects.get(game_instance=game_instance, team=team)
            except TeamInstance.DoesNotExist:
                return JsonResponse({'error': f'TeamInstance not found for team "{team_name}" in game "{game_join_code}"'}, status=404)

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
