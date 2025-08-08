from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from .models.static import (
  Team, Role, Unit, Attack, Ability, Landmark, Tile
)
from .models.dynamic import (
  GameInstance, TeamInstance, RoleInstance, UnitInstance, LandmarkInstance, LandmarkInstanceTile
)
from .serializers import (
    TeamSerializer,
    RoleSerializer,
    RoleInstanceSerializer,
    UnitSerializer,
    UnitInstanceSerializer,
    AttackSerializer,
    AbilitySerializer,
    LandmarkSerializer,
    GameInstanceSerializer,
    TeamInstanceSerializer,
    LandmarkInstanceSerializer,
    TileSerializer,
    LandmarkInstanceTileSerializer,
)

class TeamViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

class RoleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

class RoleInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = RoleInstance.objects.all()
    serializer_class = RoleInstanceSerializer

class UnitViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer

class UnitInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = UnitInstance.objects.all()
    serializer_class = UnitInstanceSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete']

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

    def update(self, request, *args, **kwargs):
        # Make PUT behave the same way
        return self.partial_update(request, *args, **kwargs)

class AttackViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Attack.objects.all()
    serializer_class = AttackSerializer

class AbilityViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Ability.objects.all()
    serializer_class = AbilitySerializer

class LandmarkViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Landmark.objects.all()
    serializer_class = LandmarkSerializer

class GameInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = GameInstance.objects.all()
    serializer_class = GameInstanceSerializer
    def get_queryset(self):
        queryset = super().get_queryset()
        join_code = self.request.query_params.get('join_code')
        if join_code:
            queryset = queryset.filter(join_code=join_code)
        return queryset

class TeamInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TeamInstance.objects.all()
    serializer_class = TeamInstanceSerializer

class LandmarkInstanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LandmarkInstance.objects.all()
    serializer_class = LandmarkInstanceSerializer

class TileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Tile.objects.all()
    serializer_class = TileSerializer

class LandmarkInstanceTileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = LandmarkInstanceTile.objects.all()
    serializer_class = LandmarkInstanceTileSerializer