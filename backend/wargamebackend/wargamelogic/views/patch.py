from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from wargamelogic.models.static import (
    Tile,
    Attack
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

from gamelogic.objects import *
from gamelogic.attack import *

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
def use_attack(request):
    attacker_id = request.data.get("attacker_id")
    target_id = request.data.get("target_id")
    attack_name = request.data.get("attack_name")

    if not attacker_id or not target_id or not attack_name:
        return Response(
            {"error": "attacker_id, target_id, and attack_name are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    attacker_instance = get_object_and_related_with_cache_or_404(
        request, UnitInstance, pk=attacker_id, select_related=["unit", "team_instance"]
    )

    role_instances = get_user_role_instances(request)
    role_instance = next(
        (ri for ri in role_instances if ri.team_instance_id == attacker_instance.team_instance_id),
        None
    )
    if role_instance is None:
        return Response({"error": "You do not control this unit."}, status=status.HTTP_403_FORBIDDEN)

    target_instance = get_object_and_related_with_cache_or_404(
        request, UnitInstance, pk=target_id, select_related=["unit", "team_instance"]
    )

    attack = get_object_or_404(Attack, unit=attacker_instance.unit, name=attack_name)

    atk = GameAttack.from_model(attack)
    target = GameUnit.from_model(target_instance)
    attacker = GameUnit.from_model(attacker_instance)

    success, message = conduct_attack(attacker, target, atk)
    if not success:
        return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

    attacker_instance.supply_count = attacker.supply_count
    target_instance.health = target.health
    attacker_instance.save()
    target_instance.save()

    return Response(
        {
            "attacker_id": attacker_instance.id,
            "target_id": target_instance.id,
            "attack_used": attack.name,
            "supply_points_remaining": attacker_instance.supply_count,
            "message": f"{attacker_instance.unit.name} used {attack.name}. {message}"
        },
        status=status.HTTP_200_OK
    )