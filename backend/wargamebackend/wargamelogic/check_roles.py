from functools import wraps
from rest_framework.response import Response
from rest_framework import status

# helper function for @role_required and @any_role_required
def role_matches(request, kwargs, **criteria):
    """
    Returns True if the current user's RoleInstance matches the given criteria.
    Automatically uses join_code and team_name from kwargs if present.
    Admin users always pass.
    """
    from .models.dynamic import RoleInstance, GameInstance

    # Admins bypass all checks
    if request.user.is_staff or request.user.is_superuser:
        return True

    # --- Game lookup ---
    join_code = kwargs.get('join_code')
    if join_code:
        try:
            game_instance = GameInstance.objects.get(join_code=join_code)
        except GameInstance.DoesNotExist:
            return False
    else:
        game_instance = None

    # --- RoleInstance lookup ---
    query = RoleInstance.objects.filter(user=request.user)
    if game_instance:
        query = query.filter(team_instance__game_instance=game_instance)
    role_instance = query.select_related('role', 'team_instance__team').first()

    if not role_instance:
        return False

    # --- Team check (only if provided in URL) ---
    team_name = kwargs.get('team_name')
    if team_name and role_instance.team_instance.team.name != team_name:
        return False

    # --- Role field checks ---
    for field, expected in criteria.items():
        if getattr(role_instance.role, field, None) != expected:
            return False

    return True

# example usage:
# @role_required(name='Combatant Commander')
def role_required(**criteria):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not role_matches(request, kwargs, **criteria):
                # Admins bypass check already in role_matches
                return Response(
                    {
                        'error': f'Access denied: requires {criteria}'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


# example usage:
# @any_role_required([
#     {'branch': 'Army', 'is_commander': True},
#     {'branch': 'Navy', 'is_commander': True}
# ])
def any_role_required(criteria_list):
    """
    Allows access if ANY criteria in the list passes.
    Automatically uses join_code and team_name from kwargs if present.
    Admins always pass.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            # Admin bypass
            if request.user.is_staff or request.user.is_superuser:
                return view_func(request, *args, **kwargs)

            for criteria in criteria_list:
                if role_matches(request, kwargs, **criteria):
                    return view_func(request, *args, **kwargs)

            # If none matched, return all allowed combinations in the error
            return Response(
                {
                    'error': 'Access denied: no role criteria matched',
                    'allowed_roles': criteria_list
                },
                status=status.HTTP_403_FORBIDDEN
            )
        return _wrapped_view
    return decorator
