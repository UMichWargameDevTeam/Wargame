from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from wargamelogic.models.static import (
    Tile
)
from wargamelogic.models.dynamic import (
    UnitInstance
)
from wargamelogic.serializers import (
    UnitInstanceSerializer
)
from wargamelogic.check_roles import (
    require_any_role_instance, get_object_and_related_with_cache_or_404, get_user_role_instances
)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        "team_instance.game_instance": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"], select_related=['team_instance__game_instance', 'unit']).team_instance.game_instance,
        "role.name": "Gamemaster",
    },
    {
        "team_instance": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).team_instance,
        "role.branch": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.branches.all(),
        "role.is_operations": lambda request, kwargs: not get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic,
        "role.is_logistics": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic 
    }
])
def move_unit_instance(request, pk, row, column):
    unit_instance = get_object_and_related_with_cache_or_404(request, UnitInstance, pk=pk)
    target_tile = get_object_or_404(Tile, row=row, column=column)
    unit_instance.tile = target_tile
    unit_instance.save()

    serializer = UnitInstanceSerializer(unit_instance)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        "team_instance.game_instance": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"], select_related=['team_instance__game_instance', 'unit']).team_instance.game_instance,
        "role.name": "Gamemaster",
    },
    {
        "team_instance": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).team_instance,
        "role.branch": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.branches.all(),
        "role.is_operations": lambda request, kwargs: not get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic,
        "role.is_logistics": lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs["pk"]).unit.is_logistic,
    }
])
def use_attack(request, pk, attack_name):
    unit_instance = get_object_and_related_with_cache_or_404(request, UnitInstance, pk=pk)

    role_instances = get_user_role_instances(request)
    role_instance = next((ri for ri in role_instances if ri.team_instance_id == unit_instance.team_instance_id), None)
    if role_instance is None:
        return Response({"error": "RoleInstance not found."}, status=status.HTTP_404_NOT_FOUND)
    
    attack = next((a for a in unit_instance.unit.attacks.all() if a.name == attack_name), None)
    if attack is None:
        return Response({"error": f"Attack '{attack_name}' not found for unit '{unit_instance.unit.name}'."}, status=status.HTTP_404_NOT_FOUND)

    if role_instance.supply_points < attack.cost:
        return Response({"detail": "Not enough supply points to perform this attack."}, status=status.HTTP_400_BAD_REQUEST)

    
    role_instance.supply_points -= attack.cost

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