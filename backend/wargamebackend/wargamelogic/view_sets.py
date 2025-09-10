import rest_framework.decorators
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from django.shortcuts import get_object_or_404
from wargamelogic.models.static import (
    Team, Branch, Role, Unit, UnitBranch, Attack, Ability, Landmark, Tile
)
from wargamelogic.models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, TeamInstanceRolePoints, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)
from wargamelogic.serializers import (
    TeamSerializer, BranchSerializer, RoleSerializer, UnitSerializer, UnitBranchSerializer, AttackSerializer, AbilitySerializer, TileSerializer, LandmarkSerializer,
    GameInstanceSerializer, TeamInstanceSerializer, RoleInstanceSerializer, TeamInstanceRolePointsSerializer, UnitInstanceSerializer, LandmarkInstanceSerializer, LandmarkInstanceTileSerializer,
)
from wargamelogic.check_roles import (
    require_role_instance, require_any_role_instance, get_object_and_related_with_cache_or_404
)

# static model view sets
class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        """
        Return the permission instances for the current request.
        
        Non-safe HTTP methods (POST, PUT, PATCH, DELETE, etc.) require admin privileges (IsAdminUser).
        Safe methods (GET, HEAD, OPTIONS) require authentication (IsAuthenticated).
        """
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        """
        Return the permission instances for the current request.
        
        Non-safe HTTP methods (POST, PUT, PATCH, DELETE, etc.) require admin privileges (IsAdminUser).
        Safe methods (GET, HEAD, OPTIONS) require authentication (IsAuthenticated).
        """
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        """
        Return the permission instances for the current request.
        
        Non-safe HTTP methods (POST, PUT, PATCH, DELETE, etc.) require admin privileges (IsAdminUser).
        Safe methods (GET, HEAD, OPTIONS) require authentication (IsAuthenticated).
        """
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class UnitBranchViewSet(viewsets.ModelViewSet):
    queryset = UnitBranch.objects.all()
    serializer_class = UnitBranchSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        """
        Return the permission instances for the current request.
        
        Non-safe HTTP methods (POST, PUT, PATCH, DELETE, etc.) require admin privileges (IsAdminUser).
        Safe methods (GET, HEAD, OPTIONS) require authentication (IsAuthenticated).
        """
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class AttackViewSet(viewsets.ModelViewSet):
    queryset = Attack.objects.all()
    serializer_class = AttackSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class AbilityViewSet(viewsets.ModelViewSet):
    queryset = Ability.objects.all()
    serializer_class = AbilitySerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class LandmarkViewSet(viewsets.ModelViewSet):
    queryset = Landmark.objects.all()
    serializer_class = LandmarkSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class TileViewSet(viewsets.ModelViewSet):
    queryset = Tile.objects.all()
    serializer_class = TileSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

# dynamic model view sets
class GameInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = GameInstance.objects.all()
    serializer_class = GameInstanceSerializer
    http_method_names = ['get', 'post', 'patch', 'put']
    
    def get_queryset(self):
        """
        Return the base queryset, optionally filtered by the 'join_code' query parameter.
        
        If the request includes a 'join_code' query parameter, the returned queryset is filtered to objects whose join_code matches that value; otherwise the unmodified superclass queryset is returned.
        """
        queryset = super().get_queryset()
        join_code = self.request.query_params.get('join_code')
        if join_code:
            queryset = queryset.filter(join_code=join_code)
        return queryset

    # anyone can create a game.

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(GameInstance, pk=kwargs['pk']), 
        'role.name':'Gamemaster'
    })
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(GameInstance, pk=kwargs['pk']), 
        'role.name':'Gamemaster'
    })
    def update(self, request, *args, **kwargs):
        """
        Update the targeted model instance and return a serialized Response.
        
        Delegates to the superclass implementation to validate input, persist changes, and produce the appropriate DRF Response for the updated object.
        
        Returns:
            rest_framework.response.Response: Response containing the serialized updated instance and the corresponding HTTP status.
        """
        return super().update(request, *args, **kwargs)


class TeamInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TeamInstance.objects.all()
    serializer_class = TeamInstanceSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(GameInstance, pk=request.data.get('game_instance_id')),
        'role.name': 'Gamemaster'
    })
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(TeamInstance, pk=kwargs['pk']).game_instance,
        'role.name': 'Gamemaster'
    })
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(TeamInstance, pk=kwargs['pk']).game_instance,
        'role.name': 'Gamemaster'
    })
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(TeamInstance, pk=kwargs['pk']).game_instance,
        'role.name': 'Gamemaster'
    })
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class RoleInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = RoleInstance.objects.all()
    serializer_class = RoleInstanceSerializer
    http_method_names = ['get', 'patch', 'put', 'delete']

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(RoleInstance, pk=kwargs['pk']).team_instance.game_instance,
        'role.name':'Gamemaster'
    })
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(RoleInstance, pk=kwargs['pk']).team_instance.game_instance,
        'role.name':'Gamemaster'
    })
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(RoleInstance, pk=kwargs['pk']).team_instance.game_instance,
        'role.name':'Gamemaster'
    })
    def destroy(self, request, *args, **kwargs):
        """
        Delete the target model instance.
        
        Performs the standard DRF destroy operation and returns HTTP 204 No Content on success. Access is subject to the view's permission checks and any role-based decorators applied to this action.
        """
        return super().destroy(request, *args, **kwargs)

class TeamInstanceRolePointsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = RoleInstance.objects.all()
    serializer_class = RoleInstanceSerializer
    http_method_names = ['get', 'patch']

    @require_any_role_instance([
        {
            'team_instance.game_instance': lambda request, kwargs: get_object_and_related_with_cache_or_404(request, TeamInstanceRolePoints, pk=kwargs['pk'], select_related=['team_instance__game_instance']).team_instance.game_instance,
            'role.name':'Gamemaster'
        },
        {
            'team_instance': lambda request, kwargs: get_object_and_related_with_cache_or_404(request, TeamInstanceRolePoints, pk=kwargs['pk']).team_instance
        }
    ])
    def partial_update(self, request, *args, **kwargs):
        """
        Perform a partial update of the targeted model instance and return the resulting response.
        
        This method delegates to the superclass implementation to apply the partial update. Access control for this action is expected to be enforced by surrounding decorators or view-level permission configuration.
        
        Parameters:
            request: DRF request carrying partial update data and authentication context.
            *args: Positional arguments forwarded to the superclass.
            **kwargs: Keyword arguments forwarded to the superclass.
        
        Returns:
            rest_framework.response.Response: The response produced by the superclass partial_update call.
        """
        return super().partial_update(request, *args, **kwargs)

class UnitInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = UnitInstance.objects.all()
    serializer_class = UnitInstanceSerializer
    http_method_names = ['get', 'delete']

    @rest_framework.decorators.permission_classes([IsAuthenticated, IsAdminUser])
    def list(self, request, *args, **kwargs):
        """
        Return a list of UnitInstance objects.
        
        This endpoint is restricted to admin users (method-level permission). It delegates to the base ModelViewSet implementation to perform the standard listing behavior.
        """
        return super().list(request, *args, **kwargs)
    
    @require_any_role_instance([
        {
            'team_instance.game_instance': lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs['pk'], select_related=['team_instance__game_instance']).team_instance.game_instance,
            'role.name':'Gamemaster'
        },
        {
            'team_instance': lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs['pk']).team_instance
        }
    ])
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single model instance and return its serialized representation.
        
        Returns:
            rest_framework.response.Response: HTTP response containing the serialized object data (200 on success, 404 if not found).
        """
        return super().retrieve(request, *args, **kwargs)

    @require_any_role_instance([
        {
            'team_instance.game_instance': lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs['pk'], select_related=['team_instance__game_instance']).team_instance.game_instance,
            'role.name':'Gamemaster'
        },
        {
            'team_instance': lambda request, kwargs: get_object_and_related_with_cache_or_404(request, UnitInstance, pk=kwargs['pk']).team_instance
        }
    ])
    def destroy(self, request, *args, **kwargs):
        """
        Delete the target model instance.
        
        Performs the standard DRF destroy operation and returns HTTP 204 No Content on success. Access is subject to the view's permission checks and any role-based decorators applied to this action.
        """
        return super().destroy(request, *args, **kwargs)


class LandmarkInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LandmarkInstance.objects.all()
    serializer_class = LandmarkInstanceSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstance, pk=kwargs['pk']).game_instance,
        'role.name': 'Gamemaster'
    })
    def create(self, request, *args, **kwargs):
        """
        Create a new instance using the viewset's serializer and return a 201 CREATED response.
        
        This action delegates to the base ModelViewSet.create implementation. Access to this endpoint is protected by a role-based decorator that requires the requester to hold the Gamemaster role on the related game instance; the decorator will return 403 or 404 when authorization or related-object resolution fails.
        
        Returns:
            rest_framework.response.Response: HTTP 201 response with the serialized created object on success, or an appropriate error response from the framework/decorators.
        """
        return super().create(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstance, pk=kwargs['pk']).game_instance,
        'role.name': 'Gamemaster'
    })
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstance, pk=kwargs['pk']).game_instance,
        'role.name': 'Gamemaster'
    })
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstance, pk=kwargs['pk']).game_instance,
        'role.name': 'Gamemaster'
    })
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

class LandmarkInstanceTileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LandmarkInstanceTile.objects.all()
    serializer_class = LandmarkInstanceTileSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstanceTile, pk=kwargs['pk']).landmark_instance.game_instance,
        'role.name': 'Gamemaster'
    })
    def create(self, request, *args, **kwargs):
        """
        Create a new instance using the viewset's serializer and return a 201 CREATED response.
        
        This action delegates to the base ModelViewSet.create implementation. Access to this endpoint is protected by a role-based decorator that requires the requester to hold the Gamemaster role on the related game instance; the decorator will return 403 or 404 when authorization or related-object resolution fails.
        
        Returns:
            rest_framework.response.Response: HTTP 201 response with the serialized created object on success, or an appropriate error response from the framework/decorators.
        """
        return super().create(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstanceTile, pk=kwargs['pk']).landmark_instance.game_instance,
        'role.name': 'Gamemaster'
    })
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)
    
    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstanceTile, pk=kwargs['pk']).landmark_instance.game_instance,
        'role.name': 'Gamemaster'
    })
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(LandmarkInstanceTile, pk=kwargs['pk']).landmark_instance.game_instance,
        'role.name': 'Gamemaster'
    })
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)