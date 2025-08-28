import rest_framework.decorators
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from django.shortcuts import get_object_or_404
from wargamelogic.models.static import (
    Team, Branch, Role, Unit, UnitBranch, Attack, Ability, Landmark, Tile
)
from wargamelogic.models.dynamic import (
    GameInstance, TeamInstance, RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)
from wargamelogic.serializers import (
    TeamSerializer, BranchSerializer, RoleSerializer, UnitSerializer, UnitBranchSerializer, AttackSerializer, AbilitySerializer, TileSerializer, LandmarkSerializer,
    GameInstanceSerializer, TeamInstanceSerializer, RoleInstanceSerializer, UnitInstanceSerializer, LandmarkInstanceSerializer, LandmarkInstanceTileSerializer,
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
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
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
        if self.request.method not in SAFE_METHODS:
            return [IsAdminUser()]
        return [IsAuthenticated()]

class UnitBranchViewSet(viewsets.ModelViewSet):
    queryset = UnitBranch.objects.all()
    serializer_class = UnitBranchSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def get_permissions(self):
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
        return super().destroy(request, *args, **kwargs)

class UnitInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = UnitInstance.objects.all()
    serializer_class = UnitInstanceSerializer
    http_method_names = ['get', 'delete']

    @rest_framework.decorators.permission_classes([IsAuthenticated, IsAdminUser])
    def list(self, request, *args, **kwargs):
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