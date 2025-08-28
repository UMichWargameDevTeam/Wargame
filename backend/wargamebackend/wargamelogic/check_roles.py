import inspect
from rest_framework import status
from rest_framework.response import Response
from django.db.models import Model, QuerySet
from django.shortcuts import get_object_or_404
from functools import wraps
from datetime import datetime
from wargamelogic.models import (
    RoleInstance
)


# ------------------------
# Request cache utilities
# ------------------------

def _get_request_cache(request):
    if not hasattr(request, "_role_check_cache"):
        request._role_check_cache = {}
    return request._role_check_cache

def _normalize_select_related(sel):
    """
    Expand each select_related path into all its prefixes.
    ['a__b__c'] → {'a', 'a__b', 'a__b__c'}
    """
    expanded = set()
    for path in sel:
        parts = path.split("__")
        for i in range(1, len(parts) + 1):
            expanded.add("__".join(parts[:i]))
    return expanded


def get_object_and_related_with_cache_or_404(request, model, *args, select_related=None, **kwargs):
    cache = _get_request_cache(request)

    # Build cache key (include select to detect new needs)
    key = (model, frozenset(kwargs.items()), args)
    entry = cache.get(key)

    sel = _normalize_select_related(select_related or [])

    if entry is None:
        qs = model.objects.all()
        if sel:
            qs = qs.select_related(*sel)
        
        obj = get_object_or_404(qs, *args, **kwargs)
        cache[key] = {
            "obj": obj,
            "select_related": sel
        }
        return obj

    # Combine previous select_relateds
    want_sel = entry["select_related"] | sel

    if want_sel != entry["select_related"]:
        qs = model.objects.all()
        qs = qs.select_related(*sorted(want_sel))
        
        obj = get_object_or_404(qs, *args, **kwargs)
        cache[key] = {
            "obj": obj,
            "select_related": want_sel
        }
        return obj

    return entry["obj"]


# ------------------------
# Helpers
# ------------------------

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
    if isinstance(value, QuerySet):
        return [str(v) for v in value]
    if isinstance(value, (list, set, tuple)):
        return [str(v) for v in value]
    return str(value)


def _json_safe_dict(d):
    return {k: _json_safe(v) for k, v in d.items()}


# ------------------------
# Core role checking
# ------------------------

def get_user_role_instances(request):
    """
    Fetch and cache the requesting user's RoleInstances for this request.
    """
    cache = _get_request_cache(request)
    if "role_instances" not in cache:
        cache["role_instances"] = list(
            RoleInstance.objects.filter(user=request.user).select_related(
                "role", "team_instance__team", "team_instance__game_instance"
            )
        )
    return cache["role_instances"]


def role_instance_matches(request, kwargs, criteria):
    if request.user.is_staff or request.user.is_superuser:
        return True, {}

    role_instances = get_user_role_instances(request)

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
            if isinstance(expected, (QuerySet, list, set, tuple)):
                if actual_value not in expected:
                    failed_fields[field] = actual_value
                    match = False
            else:
                if actual_value != expected:
                    failed_fields[field] = actual_value
                    match = False
        if match:
            return True, {}
    return False, failed_fields


# ------------------------
# Decorators
# ------------------------

def require_role_instance(criteria):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            self, request = _extract_request(args, kwargs, view_func)
            try:
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

                return Response({
                    "detail": "You do not have the required role",
                    "allowed_role": _json_safe_dict(computed_criteria),
                    "failed_fields": _json_safe_dict(failed_fields)
                }, status=status.HTTP_403_FORBIDDEN)
            finally:
                if hasattr(request, "_role_check_cache"):
                    delattr(request, "_role_check_cache")
        return _wrapped_view
    return decorator


def require_any_role_instance(criteria_list):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(*args, **kwargs):
            self, request = _extract_request(args, kwargs, view_func)
            try:
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

                return Response({
                    "detail": "You do not have a required role",
                    "allowed_roles": serialized_criteria_list,
                    "failed_fields": all_failed_fields
                }, status=status.HTTP_403_FORBIDDEN)
            finally:
                if hasattr(request, "_role_check_cache"):
                    delattr(request, "_role_check_cache")
        return _wrapped_view
    return decorator
