
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
from ..models.static import (
  Team, Role, Tile
)
from ..models.dynamic import (
  RoleInstance, UnitInstance
)
from ..game_logic import (
    move_unit_instance
)

# TODO: update this with game instance
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
