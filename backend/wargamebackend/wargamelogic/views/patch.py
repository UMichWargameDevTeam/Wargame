from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from ..models.static import (
    Attack, Tile
)
from ..models.dynamic import (
    RoleInstance, UnitInstance
)
from ..check_roles import (
    require_role_instance, require_any_role_instance, cached_get_object_or_404
)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        "team_instance.game_instance": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).team_instance.game_instance,
        "role.name": "Gamemaster",
    },
    {
        "team_instance": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).team_instance,
        "role.branch": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.branches.all(),
        "role.is_operations": lambda request, kwargs: not cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic,
        "role.is_logistics": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic 
    }
])
def move_unit_instance(request, pk, row, column):
    unit_instance = cached_get_object_or_404(request, UnitInstance, pk=pk)
    target_tile = get_object_or_404(Tile, row=row, column=column)
    unit_instance.tile = target_tile
    unit_instance.save()

    return Response(
        {
            "unit_instance_id": unit_instance.id,
            "unit_name": unit_instance.unit.name,
            "new_tile": {
                "row": target_tile.row, 
                "column": target_tile.column
            },
        },
        status=status.HTTP_200_OK
    )

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        "team_instance.game_instance": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).team_instance.game_instance,
        "role.name": "Gamemaster",
    },
    {
        "team_instance": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).team_instance,
        "role.branch": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.branches.all(),
        "role.is_operations": lambda request, kwargs: not cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic,
        "role.is_logistics": lambda request, kwargs: cached_get_object_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic,
    }
])
def use_attack(request, pk, attack_name):
    unit_instance = cached_get_object_or_404(request, UnitInstance, pk=pk)
    try:
        attack = unit_instance.unit.attacks.get(name=attack_name)
    except Attack.DoesNotExist:
        return Response(
            {"detail": f"Attack '{attack_name}' not found for unit '{unit_instance.unit.name}'."},
            status=status.HTTP_404_NOT_FOUND
        )

    role_instance = cached_get_object_or_404(request, RoleInstance, user=request.user, team_instance=unit_instance.team_instance)

    if role_instance.supply_points < attack.cost:
        return Response(
            {"detail": "Not enough supply points to perform this attack."},
            status=status.HTTP_400_BAD_REQUEST
        )

    role_instance.supply_points -= attack.cost
    # TODO: actual attack logic here
    role_instance.save()

    return Response(
        {
            "unit_instance_id": unit_instance.id,
            "unit_name": unit_instance.unit.name,
            "attack_used": attack.name,
            "supply_points_remaining": role_instance.supply_points,
            "message": f"{unit_instance.unit.name} used {attack.name}, costing {attack.cost} supply points."
        },
        status=status.HTTP_200_OK
    )