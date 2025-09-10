from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from wargamelogic.consumers import get_redis_client
from wargamelogic.models.dynamic import (
    GameInstance
)
from wargamelogic.check_roles import (
    require_role_instance
)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
@require_role_instance({
    'team_instance.game_instance.join_code': lambda request, kwargs: kwargs['join_code'],
    'role.name':'Gamemaster'
})
def delete_game_instance(request, join_code):
    """
    Delete the GameInstance identified by join_code and remove related Redis keys.
    
    Retrieves the GameInstance with the given join_code (raises Http404 if not found), deletes it from the database, then removes any Redis keys matching "game_{join_code}_*". Returns an HTTP 200 Response containing a confirmation message.
    
    Parameters:
        join_code (str): Join code of the GameInstance to delete.
    
    Returns:
        rest_framework.response.Response: HTTP 200 response with a detail message.
    
    Raises:
        Http404: If no GameInstance exists with the given join_code.
    """
    game_instance = get_object_or_404(GameInstance, join_code=join_code)
    game_instance.delete()

    redis_client = get_redis_client()
    keys = redis_client.keys(f"game_{join_code}_*")
    if keys:
        redis_client.delete(*keys)

    return Response(
        {"detail": f"GameInstance {join_code} deleted and Redis keys cleared."},
        status=status.HTTP_200_OK
    )