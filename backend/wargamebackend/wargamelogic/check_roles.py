from functools import wraps
from django.http import JsonResponse
from django.db.models import Model
from datetime import datetime
import inspect
from .models import RoleInstance


def _extract_request(args, kwargs, view_func):
    """
    Find 'request' in args/kwargs by inspecting the view function's signature.
    Returns (self_or_none, request) for methods, or (None, request) for functions.
    Falls back to scanning for first arg/kwarg with `.user`.
    """
    try:
        sig = inspect.signature(view_func)
        bound_args = sig.bind_partial(*args, **kwargs)
        bound_args.apply_defaults()
        request = bound_args.arguments.get('request', None)
        self_obj = bound_args.arguments.get('self', None)
        if request is not None:
            return self_obj, request
    except (TypeError, ValueError):
        pass  # Signature inspection failed, fall back to scanning.

    # Fallback: find first object with `.user`
    for arg in list(args) + list(kwargs.values()):
        if hasattr(arg, "user"):
            return (args[0] if args and arg is not args[0] else None), arg

    return None, None


def get_nested_attr(obj, attr, default=None):
    try:
        for part in attr.split('.'):
            obj = getattr(obj, part)
        return obj
    except AttributeError:
        return default


def _json_safe(value):
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Model):
        return str(value)
    return str(value)


def _json_safe_dict(d):
    return {k: _json_safe(v) for k, v in d.items()}


def role_instance_matches(request, kwargs, criteria):
    if request.user.is_staff or request.user.is_superuser:
        return True, {}

    role_instances = RoleInstance.objects.filter(user=request.user).select_related(
        'role', 'team_instance__team', 'team_instance__game_instance'
    )

    failed_fields = {}

    for role_instance in role_instances:
        match = True
        for field, expected in criteria.items():
            actual_value = get_nested_attr(role_instance, field, None)
            if callable(expected):
                try:
                    expected = expected(request, kwargs)
                except Exception as e:
                    failed_fields[field] = f"<error: {e}>"
                    match = False
                    continue
            if actual_value != expected:
                failed_fields[field] = actual_value
                match = False
        if match:
            return True, {}
    return False, failed_fields


def require_role_instance(criteria):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            self, request = _extract_request(args, kwargs, view_func)
            matches, failed_fields = role_instance_matches(request, kwargs, criteria)
            if matches:
                return view_func(*args, **kwargs)

            computed_criteria = {}
            for k, v in criteria.items():
                if callable(v):
                    try:
                        result = v(request, kwargs)
                        computed_criteria[k] = result
                    except Exception as e:
                        computed_criteria[k] = f"<error: {e}>"
                else:
                    computed_criteria[k] = v

            return JsonResponse({
                "detail": "You do not have the required role",
                "allowed_role": _json_safe_dict(computed_criteria),
                "failed_fields": _json_safe_dict(failed_fields)
            }, status=403)
        return _wrapped_view
    return decorator


def require_any_role_instance(criteria_list):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            self, request = _extract_request(args, kwargs, view_func)

            all_failed_fields = []
            for criteria in criteria_list:
                matches, failed_fields = role_instance_matches(request, kwargs, criteria)
                if matches:
                    return view_func(*args, **kwargs)
                all_failed_fields.append(_json_safe_dict(failed_fields))

            serialized_criteria_list = []
            for criteria in criteria_list:
                computed_criteria = {}
                for k, v in criteria.items():
                    if callable(v):
                        try:
                            result = v(request, kwargs)
                            computed_criteria[k] = result
                        except Exception as e:
                            computed_criteria[k] = f"<error: {e}>"
                    else:
                        computed_criteria[k] = v
                serialized_criteria_list.append(_json_safe_dict(computed_criteria))

            return JsonResponse({
                "detail": "You do not have a required role",
                "allowed_roles": serialized_criteria_list,
                "failed_fields": all_failed_fields
            }, status=403)
        return _wrapped_view
    return decorator
