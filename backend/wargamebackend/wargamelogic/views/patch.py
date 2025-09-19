from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from auth.authentication import CookieJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from wargamelogic.models.static import (
    Tile, Attack
)
from wargamelogic.models.dynamic import (
    GameInstance, RoleInstance, TeamInstanceRolePoints, UnitInstance
)
from wargamelogic.serializers import (
    GameInstanceSerializer, RoleInstanceSerializer, TeamInstanceRolePointsSerializer, UnitInstanceSerializer
)
from wargamelogic.gamelogic.attack import (
    GameAttack, GameUnit, conduct_attack
)
from auth.authorization import (
    require_role_instance, require_any_role_instance, get_object_and_related_with_cache_or_404, get_user_role_instances
)


@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role_instance({
    'id': lambda request, kwargs: kwargs['pk']
})
def toggle_ready(request, pk):
    """
    body: {
        ready: boolean
    }
    """
    ready = request.data.get("ready")

    if not isinstance(ready, bool):
        return Response({"detail": "missing boolean 'ready' in payload"}, status=status.HTTP_400_BAD_REQUEST)

    role_instance = get_object_and_related_with_cache_or_404(
        request,
        RoleInstance,
        pk=pk
    )

    role_instance.ready = ready
    role_instance.save(update_fields=['ready'])

    serializer = RoleInstanceSerializer(role_instance)
    return Response(serializer.data)

@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role_instance({
    "team_instance.game_instance.join_code": lambda request, kwargs: kwargs["join_code"],
    "role.name": "Gamemaster",
})
def set_turn(request, join_code):
    """
    body: {
        turn: int,
        turn_finish_time: int
    }
    """
    turn = request.data.get("turn")
    turn_finish_time = request.data.get("turn_finish_time")

    if not isinstance(turn, int) or not isinstance(turn_finish_time, int):
        return Response({"detail": "missing integer 'turn' or integer 'turn_finish_time' in payload"}, status=status.HTTP_400_BAD_REQUEST)

    game_instance = get_object_and_related_with_cache_or_404(
        request,
        GameInstance,
        join_code=join_code
    )

    game_instance.turn = turn
    game_instance.turn_finish_time = turn_finish_time
    game_instance.save(update_fields=['turn', 'turn_finish_time'])

    RoleInstance.objects.filter(
        team_instance__game_instance__join_code=join_code
    ).update(ready=False)

    serializer = GameInstanceSerializer(game_instance)
    return Response(serializer.data)

@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
@permission_classes([IsAuthenticated])
@require_role_instance({
    "team_instance.game_instance.join_code": lambda request, kwargs: kwargs["join_code"],
    "role.name": "Gamemaster",
})
def set_timer(request, join_code):
    """
    body: {
        turn_finish_time: BigInt | None
    }
    """
    turn_finish_time = request.data.get("turn_finish_time")

    if turn_finish_time is not None and not isinstance(turn_finish_time, int):
        return Response({"detail": "missing integer 'turn_finish_time' in payload"}, status=status.HTTP_400_BAD_REQUEST)

    game_instance = get_object_and_related_with_cache_or_404(
        request,
        GameInstance,
        join_code=join_code
    )

    game_instance.turn_finish_time = turn_finish_time
    game_instance.save(update_fields=['turn_finish_time'])

    serializer = GameInstanceSerializer(game_instance)
    return Response(serializer.data)

@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
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
@transaction.atomic
def send_points(request, join_code, team_name, role_name):
    """
    body: {
        transfers: [
            {
                team_name: string,
                role_name: string,
                supply_points: float
            },
            ...
        ]
    }
    """
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
        supply_points = transfer.get("supply_points")

        if not recipient_team_name or not recipient_role_name or supply_points is None or supply_points < 0:
            return Response({"error": f"Invalid transfer: {transfer}"}, status=status.HTTP_400_BAD_REQUEST)

        total_supply_points += supply_points

    if sender_team_instance_role_points.supply_points < total_supply_points:
        return Response({"detail": f"You wanted to send {total_supply_points} supply points, but you only have {sender_team_instance_role_points.supply_points}!"}, status=status.HTTP_400_BAD_REQUEST)

    recipients = []

    for transfer in transfers:
        recipient_team_name = transfer["team_name"]
        recipient_role_name = transfer["role_name"]
        supply_points = transfer["supply_points"]

        recipient = get_object_or_404(
            TeamInstanceRolePoints,
            team_instance__game_instance=sender_team_instance_role_points.team_instance.game_instance,
            team_instance__team__name=recipient_team_name,
            role__name=recipient_role_name,
        )

        recipient.supply_points += supply_points
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
@authentication_classes([CookieJWTAuthentication])
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
    return Response(serializer.data)

@api_view(['PATCH'])
@authentication_classes([CookieJWTAuthentication])
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
@transaction.atomic
def use_attack(request, pk, attack_name):
    # TODO: remove pk from URL since attacker_id is already provided in the body
    """
    body: {
        attacker_id: int,
        target_id: int,
        attack_name: string
    }
    """
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