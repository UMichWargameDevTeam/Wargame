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
    """
    Return a per-request dictionary used to cache role-checking data.
    
    Ensures the Request object has a `_role_check_cache` attribute and returns it.
    This cache is intended for storing request-scoped values (e.g., fetched role
    instances or fetched model objects) to avoid repeated database lookups during
    the same request.
    
    Parameters:
        request: A Django/DRF Request (or any object) that will receive the cache
            as the `_role_check_cache` attribute.
    
    Returns:
        dict: The per-request cache dictionary (created if missing).
    """
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
    """
    Retrieve a model instance using get_object_or_404 while caching the result on the given request and ensuring requested select_related joins are honored.
    
    On first lookup this fetches the object (optionally with the provided select_related paths) and stores it in a per-request cache keyed by the model and lookup args/kwargs. Subsequent calls for the same lookup reuse the cached object; if a later call requests additional select_related paths, the function will re-fetch the object with the merged set of select_related prefixes and update the cache.
    
    Parameters:
        request: The current HTTP request object used to store per-request cache.
        model: Django model class to query.
        select_related: Iterable of select_related paths (e.g. ['a__b', 'c']) to apply; prefixes are normalized and merged across calls.
        *args, **kwargs: Positional and keyword lookup arguments forwarded to get_object_or_404.
    
    Returns:
        The retrieved model instance.
    
    Raises:
        Http404: If no matching object exists (propagated from get_object_or_404).
    
    Side effects:
        Caches the fetched object and the set of applied select_related paths on the request.
    """
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
    """
    Convert a value to a JSON-safe representation.
    
    Handles common Python and Django types so the result can be serialized to JSON:
    - None, bool, int, float, str: returned unchanged
    - datetime: returned as ISO 8601 string via .isoformat()
    - django Model: returned as its string representation (str(instance))
    - django QuerySet and list/set/tuple: returned as a list of string representations
    - all other values: returned as str(value)
    
    Parameters:
        value: The value to convert.
    
    Returns:
        A JSON-serializable representation of the input value.
    """
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
    """
    Return a new dict with the same keys and JSON-serializable representations of the values.
    
    Each value from the input mapping is converted using _json_safe; keys are preserved as-is.
    
    Parameters:
        d (dict): Mapping whose values will be converted.
    
    Returns:
        dict: New dictionary with the same keys and JSON-safe values.
    """
    return {k: _json_safe(v) for k, v in d.items()}


# ------------------------
# Core role checking
# ------------------------

def get_user_role_instances(request):
    """
    Return the requesting user's RoleInstance objects for the current request, using a per-request cache.
    
    If the RoleInstances are not yet cached on the request, they are fetched from the database with select_related for
    "role", "team_instance__team", and "team_instance__game_instance", stored in the request-scoped cache, and returned.
    
    Parameters:
        request: Django HttpRequest — the incoming request whose user will be used to look up RoleInstance objects.
    
    Returns:
        list: A list of RoleInstance model instances belonging to request.user. The same list object is cached and reused
        for the lifetime of the request.
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
    """
    Determine whether the requesting user has at least one RoleInstance that satisfies the given criteria.
    
    Each key in `criteria` is a dotted attribute path resolved on a RoleInstance; each value may be:
    - a concrete value: the role instance's attribute must equal it,
    - a collection (QuerySet, list/tuple/set): the attribute value must be a member,
    - a callable: will be called as callable(request, kwargs) and its result used as the expected value.
    
    Immediate success is returned for staff or superusers.
    
    Returns:
        (bool, dict): A tuple where the first element is True if a matching RoleInstance was found (or the user is staff/superuser), otherwise False. The second element is a dict of failed fields mapping field names to the actual attribute value for mismatches, or to a string of the form "<error: ...>" if evaluating a callable criterion raised an exception.
    """
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
    """
    Decorator factory that enforces that the requesting user has a RoleInstance matching the given criteria.
    
    The returned decorator wraps a Django/DRF view function and, when called, attempts to extract the request object and evaluate whether any of the current user's RoleInstance objects satisfy the provided criteria (using role_instance_matches). Each criterion value may be a literal (checked for equality or membership) or a callable taking (request, kwargs) and returning the expected value.
    
    Behavior:
    - If a matching RoleInstance is found, the original view is invoked normally.
    - If no match is found, returns a DRF Response with HTTP 403 and JSON body containing:
      - "detail": short failure message
      - "allowed_role": the criteria with callables evaluated (errors rendered as "<error: ...>"), JSON-safe
      - "failed_fields": per-field mismatch information, JSON-safe
    - Always removes the per-request "_role_check_cache" attribute from the request (if present) before returning.
    
    Parameters:
        criteria (mapping): A dict mapping role field paths to either expected values or callables of signature (request, kwargs) -> value.
    
    Returns:
        function: A decorator that can be applied to a view function.
    """
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
    """
    Decorator factory that enforces that the requesting user satisfies at least one of the provided role criteria.
    
    Produces a decorator for view functions. The decorated view will:
    - Extract the Django REST request from the view call.
    - For each criteria dict in criteria_list, evaluate whether the request's user has a matching RoleInstance (via the module's role matching logic).
    - If any criteria set matches, invoke the wrapped view and return its response.
    - If none match, return a DRF Response with HTTP 403 and a JSON body containing:
      - "detail": a short error message,
      - "allowed_roles": a list of the provided criteria with any callable values evaluated (callable evaluation errors are represented as "<error: ...>"),
      - "failed_fields": a list of per-criteria failure details.
    
    Side effects:
    - Removes the per-request attribute "_role_check_cache" from the request (if present) before returning.
    """
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
