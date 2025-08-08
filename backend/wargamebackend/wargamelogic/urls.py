from django.urls import path, include
from .views import (
    get, post, patch
)
from rest_framework.routers import DefaultRouter
from .view_sets import (
    TeamViewSet,
    RoleViewSet,
    RoleInstanceViewSet,
    UnitViewSet,
    UnitInstanceViewSet,
    AttackViewSet,
    AbilityViewSet,
    LandmarkViewSet,
    LandmarkInstanceViewSet,
    TileViewSet,
    LandmarkInstanceTileViewSet,
    GameInstanceViewSet
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'role-instances', RoleInstanceViewSet)
router.register(r'units', UnitViewSet)
router.register(r'unit-instances', UnitInstanceViewSet)
router.register(r'attacks', AttackViewSet)
router.register(r'abilities', AbilityViewSet)
router.register(r'landmarks', LandmarkViewSet)
router.register(r'landmark-instances', LandmarkInstanceViewSet)
router.register(r'tiles', TileViewSet)
router.register(r'landmark-instance-tiles', LandmarkInstanceTileViewSet)
router.register(r'game-instances', GameInstanceViewSet, basename='game-instance')


urlpatterns = [
    path('api/mainmap/', get.main_map, name='main_map'),
    path('api/register_role/', post.register_role, name='register_role'),

    path('api/teams/<str:name>/', get.get_team_by_name, name='get_team_by_name'),
    path('api/roles/<str:name>/', get.get_role_by_name, name='get_role_by_name'),
    path('api/units/<str:unit_name>/attacks/<str:attack_name>/', get.get_attack_by_unit_and_name, name='get_attack_by_unit_and_name'),
    path('api/units/<str:unit_name>/abilities/<str:ability_name>/', get.get_ability_by_unit_and_name, name='get_ability_by_unit_and_name'),
    path('api/units/<str:unit_name>/', get.get_unit_by_name, name='get_unit_by_name'),
    path('api/landmarks/<str:name>/', get.get_landmark_by_name, name='get_landmark_by_name'),
    path('api/tiles/<int:row>/<int:column>/', get.get_tile_by_coords, name='get_tile_by_coords'),

    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/', get.get_game_team_instances_by_name, name='get_game_team_instances_by_name'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/role-instances/<str:role_name>/', get.get_game_role_instances_by_team_and_role, name='get_role_instance_by_team_and_role'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/unit-instances/', get.get_game_unit_instances_by_team_name, name='get_game_unit_instances_by_team_name'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/unit-instances/<str:domain>', get.get_game_unit_instances_by_team_name_and_domain, name='get.get_game_unit_instances_by_team_name_and_domain'),
    path('api/game-instances/<str:join_code>/unit-instances/', get.get_game_unit_instances, name='get_game_unit_instances'),
    path('api/game-instances/<str:join_code>/landmark-instances/<int:pk>/tiles/', get.get_game_tiles_for_landmark_instance_by_id, name='get_tiles_for_landmark_instance_by_id'),
    path('api/game-instances/<str:join_code>/tiles/<int:row>/<int:column>/landmark-instances/', get.get_game_landmark_instances_for_tile_by_coords, name='get_landmark_instances_for_tile_by_coords'),

    path('api/game/move-unit', post.move_unit, name='move_unit'),

    path('api/', include(router.urls)),
]