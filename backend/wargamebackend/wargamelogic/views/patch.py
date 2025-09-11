from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from wargamelogic.models.static import (
    Team, Role, Tile, Attack
)
from wargamelogic.models.dynamic import (
    TeamInstance, TeamInstanceRolePoints, UnitInstance
)
from wargamelogic.serializers import (
    TeamInstanceRolePointsSerializer, UnitInstanceSerializer
)
from wargamelogic.check_roles import (
    require_any_role_instance, get_object_and_related_with_cache_or_404, get_user_role_instances
)

from ..gamelogic.objects import *
from ..gamelogic.attack import *

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@require_any_role_instance([
    {
        "team_instance.game_instance": lambda request, kwargs: get_object_and_related_with_cache_or_404(
            request,
            TeamInstanceRolePoints, 
            team_instance__game_instance__join_code=kwargs["join_code"],
            team_instance__team__name=kwargs["team_name"],
            role__name=kwargs["role_name"], 
            select_related=['team_instance__game_instance', 'role']
        ).team_instance.game_instance,
        "role.name": "Gamemaster",
    },
    {
        "team_instance": lambda request, kwargs: get_object_and_related_with_cache_or_404(
            request,
            TeamInstanceRolePoints, 
            team_instance__game_instance__join_code=kwargs["join_code"],
            team_instance__team__name=kwargs["team_name"],
            role__name=kwargs["role_name"], 
            select_related=['team_instance__game_instance', 'role']
        ).team_instance
    }
])
def send_points(request, join_code, team_name, role_name):
    sender_team_instance_role_points = get_object_and_related_with_cache_or_404(
        request,
        TeamInstanceRolePoints, 
        team_instance__game_instance__join_code=join_code,
        team_instance__team__name=team_name,
        role__name=role_name,
        select_related=['team_instance__game_instance', 'role']
    )

    transfers = request.data.get("transfers", [])
    if not isinstance(transfers, list) or not transfers:
        return Response({"detail": "Invalid transfers payload"}, status=status.HTTP_400_BAD_REQUEST)

    total_supply_points = 0

    for transfer in transfers:
        recipient_team_name = transfer.get("team_name")
        recipient_role_name = transfer.get("role_name")
        num_supply_points = transfer.get("supply_points")

        if not recipient_team_name or not recipient_role_name or num_supply_points < 0:
            return Response({"error": f"Invalid transfer: {transfer}"}, status=status.HTTP_400_BAD_REQUEST)
        
        total_supply_points += num_supply_points

    if sender_team_instance_role_points.supply_points < total_supply_points:
        return Response({"detail": f"You wanted to send {total_supply_points} supply points, but you only have {sender_team_instance_role_points.supply_points}!"}, status=status.HTTP_400_BAD_REQUEST)

    recipients = []

    # potential race condition here but we're ignoring that lol
    for transfer in transfers:
        recipient_team_name = transfer["team_name"]
        recipient_role_name = transfer["role_name"]
        num_supply_points = transfer["supply_points"]

        recipient = get_object_or_404(
            TeamInstanceRolePoints,
            team_instance__game_instance=sender_team_instance_role_points.team_instance.game_instance,
            team_instance__team__name=recipient_team_name,
            role__name=recipient_role_name,
        )

        recipient.supply_points += num_supply_points
        recipient.save(update_fields=["supply_points"])
        recipients.append(recipient)
    
    sender_team_instance_role_points.supply_points -= total_supply_points
    sender_team_instance_role_points.save(update_fields=["supply_points"])

    serializer = TeamInstanceRolePointsSerializer(recipients, many=True)
    data = serializer.data
    # Replace supply_points with the transfer amount
    for recipient_data, transfer in zip(data, transfers):
        recipient_data["supply_points"] = transfer["supply_points"]

    return Response(data, status=status.HTTP_200_OK)


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

    atk = GameAttack.from_models(attack)
    target = GameUnit.from_models(target_instance, target_instance.unit)
    attacker = GameUnit.from_models(attacker_instance, attacker_instance.unit)

    success, message = conduct_attack(attacker, target, atk)
    if not success:
        return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

    attacker_instance.supply_points = attacker.supply_points
    target_instance.health = target.health
    attacker_instance.save()
    target_instance.save()

    return Response(
        {
            "attacker_id": attacker_instance.id,
            "target_id": target_instance.id,
            "attack_used": attack.name,
            "supply_points_remaining": attacker_instance.supply_points,
            "message": f"{attacker_instance.unit.name} used {attack.name}. {message}"
        },
        status=status.HTTP_200_OK
    )