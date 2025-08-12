from django.http import JsonResponse
from functools import wraps
from .models.static import Team
from .models.dynamic import RoleInstance, GameInstance


class RoleDenied(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message


class GlobalRoleDenied(RoleDenied):
    pass


def resolve_arg(arg, request, kwargs, model_class=None, model_lookup=None, global_error_msg=None):
    """
    Resolves an argument into its actual object:
    - Callable(request, kwargs)
    - Model instance
    - String (looked up in model_class if provided)
    """
    if callable(arg):
        return arg(request, kwargs)
    elif model_class and isinstance(arg, str):
        try:
            return model_class.objects.get(**{model_lookup: arg})
        except model_class.DoesNotExist:
            raise GlobalRoleDenied(global_error_msg or f"{model_class.__name__} not found")
    elif model_class and isinstance(arg, model_class):
        return arg
    elif model_class is None:
        return arg
    else:
        raise RoleDenied(f"Invalid type for {model_class.__name__ if model_class else 'argument'}")


def role_matches(request, kwargs, **criteria):
    """
    Flexible role matching:
    - 'game_instance' is REQUIRED (callable, object, or join_code string)
    - 'team' is OPTIONAL (callable, object, or name string)
    - Remaining keys match against role fields.
    """
    if request.user.is_staff or request.user.is_superuser:
        return True

    # --- GameInstance resolution ---
    game_instance_arg = criteria.pop('game_instance', None)
    if game_instance_arg is None:
        raise GlobalRoleDenied("No game_instance provided in require_role")

    game_instance = resolve_arg(
        game_instance_arg,
        request,
        kwargs,
        model_class=GameInstance,
        model_lookup="join_code",
        global_error_msg="GameInstance not found"
    )

    # --- RoleInstance lookup ---
    query = RoleInstance.objects.filter(
        user=request.user,
        team_instance__game_instance=game_instance
    )
    role_instance = query.select_related('role', 'team_instance__team').first()
    if not role_instance:
        raise GlobalRoleDenied("You do not have a role in this game")

    # --- Team resolution ---
    team_arg = criteria.pop('team', None)
    if team_arg is not None:
        expected_team = resolve_arg(
            team_arg,
            request,
            kwargs,
            model_class=Team,
            model_lookup="name",
            global_error_msg="Team not found"
        )
        if role_instance.team_instance.team != expected_team:
            raise GlobalRoleDenied(f"You are not part of the required team: {expected_team}")

    # --- Role field checks ---
    for field, expected in criteria.items():
        if getattr(role_instance.role, field, None) != expected:
            raise RoleDenied(f"Your role does not meet the required {field}={expected}")

    return True


def require_role(**criteria):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            try:
                if role_matches(request, kwargs, **criteria):
                    return view_func(request, *args, **kwargs)
            except RoleDenied as e:
                return JsonResponse({'error': e.message}, status=403)
            return JsonResponse({'error': 'Permission denied'}, status=403)
        return _wrapped_view
    return decorator


def require_any_role(criteria_list):
    """
    Allows access if ANY criteria in the list passes.
    Uses the same dynamic resolution as require_role.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            for criteria in criteria_list:
                try:
                    if role_matches(request, kwargs, **criteria):
                        return view_func(request, *args, **kwargs)
                except GlobalRoleDenied as e:
                    return JsonResponse({'error': e.message}, status=403)
                except RoleDenied:
                    pass

            return JsonResponse(
                {
                    'error': 'Access denied: no role criteria matched',
                    'allowed_roles': criteria_list
                },
                status=403
            )
        return _wrapped_view
    return decorator
