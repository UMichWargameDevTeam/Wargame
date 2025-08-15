from rest_framework.permissions import IsAuthenticated, IsAdminUser, SAFE_METHODS
from rest_framework.response import Response
import rest_framework.decorators
from rest_framework import viewsets, status
from .models.static import (
  Team, Role, Unit, Attack, Ability, Landmark, Tile
)
from .models.dynamic import (
  GameInstance, TeamInstance, RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)
from .serializers import (
    TeamSerializer,
    RoleSerializer,
    UnitSerializer,
    AttackSerializer,
    AbilitySerializer,
    LandmarkSerializer,
    TileSerializer,

    GameInstanceSerializer,
    TeamInstanceSerializer,
    RoleInstanceSerializer,
    UnitInstanceSerializer,
    LandmarkInstanceSerializer,
    LandmarkInstanceTileSerializer,
)
from django.shortcuts import get_object_or_404
from .check_roles import (
    require_role_instance, require_any_role_instance
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
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']
    
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

    @require_role_instance({
        'team_instance.game_instance': lambda request, kwargs: get_object_or_404(GameInstance, pk=kwargs['pk']), 
        'role.name':'Gamemaster'
    })
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

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
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    def create(self, request, *args, **kwargs):
        role_id = request.data.get("role_id")
        team_instance_id = request.data.get("team_instance_id")
        user_id = request.data.get("user_id")

        if not role_id or not team_instance_id or not user_id:
            return Response(
                {"error": "Missing role_id, team_instance_id, or user_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if int(user_id) != request.user.id:
            return Response(
                {"error": "You cannot create a role for another user"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response(
                {"error": f"Role not found with id: {role_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            team_instance = TeamInstance.objects.select_related("game_instance").get(id=team_instance_id)
        except TeamInstance.DoesNotExist:
            return Response(
                {"error": f"TeamInstance not found with id: {team_instance_id}"},
                status=status.HTTP_404_NOT_FOUND
            )

        game_instance = team_instance.game_instance

        if role.name == "Gamemaster":
            if RoleInstance.objects.filter(
                team_instance__game_instance=game_instance,
                role__name="Gamemaster"
            ).exists():
                return Response(
                    {"error": "This game already has a Gamemaster"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if RoleInstance.objects.filter(
            team_instance__game_instance=game_instance,
            user=request.user
        ).exists():
            return Response(
                {"error": f"User {request.user.username} already has a role in this game"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)

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
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    # TODO: restrict the get method of this endpoint once we receive more info from mechanics team
    # TODO: restrict the post method of this endpoint once we receive more info from mechanics team

    @rest_framework.decorators.permission_classes([IsAuthenticated, IsAdminUser])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @require_any_role_instance([
        {
            'team_instance.game_instance': lambda request, kwargs: get_object_or_404(UnitInstance, pk=kwargs['pk']).team_instance.game_instance,
            'role.name':'Gamemaster'
        },
        {
            'team_instance': lambda request, kwargs: get_object_or_404(UnitInstance, pk=kwargs['pk']).team_instance
            # TODO: add more criteria here once we get more info from the mechanics team
        }
    ])
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()

        row = request.data.get("row")
        column = request.data.get("column")

        if row is not None and column is not None:
            tile, created = Tile.objects.get_or_create(
                row=row,
                column=column,
                defaults={"terrain": "Plains/Grasslands"}  # default
            )
            instance.tile = tile
            instance.save()

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    @require_any_role_instance([
        {
            'team_instance.game_instance': lambda request, kwargs: get_object_or_404(UnitInstance, pk=kwargs['pk']).team_instance.game_instance,
            'role.name':'Gamemaster'
        },
        {
            'team_instance': lambda request, kwargs: get_object_or_404(UnitInstance, pk=kwargs['pk']).team_instance
            # TODO: add more criteria here once we get more info from the mechanics team
        }
    ])
    def update(self, request, *args, **kwargs):
        # Make PUT behave the same way
        return self.partial_update(request, *args, **kwargs)
    
    @require_any_role_instance([
        {
            'team_instance.game_instance': lambda request, kwargs: get_object_or_404(UnitInstance, pk=kwargs['pk']).team_instance.game_instance,
            'role.name':'Gamemaster'
        },
        {
            'team_instance': lambda request, kwargs: get_object_or_404(UnitInstance, pk=kwargs['pk']).team_instance
        }
    ])
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)


class LandmarkInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LandmarkInstance.objects.all()
    serializer_class = LandmarkInstanceSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

    # TODO: think more about how we'll actually create landmark instances and who should have permission to do so

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

    # TODO: think more about how we'll actually create landmark instances and who should have permission to do so

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