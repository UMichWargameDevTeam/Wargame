from functools import wraps
from django.http import JsonResponse
from django.db.models import Model
from .models import RoleInstance


def get_nested_attr(obj, attr, default=None):
    """Safely get nested attributes via dot notation."""
    try:
        for part in attr.split('.'):
            obj = getattr(obj, part)
        return obj
    except AttributeError:
        return default


def role_instance_matches(request, kwargs, criteria):
    """Return True if the user has a RoleInstance matching all criteria."""
    if request.user.is_staff or request.user.is_superuser:
        return True

    role_instances = RoleInstance.objects.filter(user=request.user).select_related(
        'role', 'team_instance__team', 'team_instance__game_instance'
    )

    for role_instance in role_instances:
        match = True
        for field, expected in criteria.items():
            actual_value = get_nested_attr(role_instance, field, None)
            if callable(expected):
                expected = expected(request, kwargs)
            if actual_value != expected:
                match = False
                break
        if match:
            return True
    return False


def require_role_instance(criteria):
    """Require a single RoleInstance matching given criteria."""
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if role_instance_matches(request, kwargs, criteria):
                return view_func(request, *args, **kwargs)

            computed_criteria = {}
            for k, v in criteria.items():
                if callable(v):
                    try:
                        result = v(request, kwargs)
                        computed_criteria[k] = str(result) if isinstance(result, Model) else result
                    except Exception as e:
                        computed_criteria[k] = f"<error: {e}>"
                else:
                    computed_criteria[k] = str(v) if isinstance(v, Model) else v

            return JsonResponse({
                "detail": "You do not have the required role",
                "allowed_role": computed_criteria
            }, status=403)
        return _wrapped_view
    return decorator


def require_any_role_instance(criteria_list):
    """Require at least one matching RoleInstance from multiple criteria sets."""
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            for criteria in criteria_list:
                if role_instance_matches(request, kwargs, criteria):
                    return view_func(request, *args, **kwargs)

            serialized_criteria_list = []
            for criteria in criteria_list:
                computed_criteria = {}
                for k, v in criteria.items():
                    if callable(v):
                        try:
                            result = v(request, kwargs)
                            computed_criteria[k] = str(result) if isinstance(result, Model) else result
                        except Exception as e:
                            computed_criteria[k] = f"<error: {e}>"
                    else:
                        computed_criteria[k] = str(v) if isinstance(v, Model) else v
                serialized_criteria_list.append(computed_criteria)

            return JsonResponse({
                "detail": "You do not have a required role",
                "allowed_roles": serialized_criteria_list
            }, status=403)
        return _wrapped_view
    return decorator