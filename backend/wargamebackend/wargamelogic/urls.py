from rest_framework.routers import DefaultRouter
from django.urls import path, include
from wargamelogic.views import (
    get, post, patch, delete
)
from wargamelogic.view_sets import (
    TeamViewSet, BranchViewSet, RoleViewSet, UnitViewSet, UnitBranchViewSet, AttackViewSet, AbilityViewSet, LandmarkViewSet, TileViewSet,
    GameInstanceViewSet, TeamInstanceViewSet, RoleInstanceViewSet, UnitInstanceViewSet, LandmarkInstanceViewSet, LandmarkInstanceTileViewSet
)

router = DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'branches', BranchViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'units', UnitViewSet)
router.register(r'unit-branches', UnitBranchViewSet)
router.register(r'attacks', AttackViewSet)
router.register(r'abilities', AbilityViewSet)
router.register(r'landmarks', LandmarkViewSet)
router.register(r'tiles', TileViewSet)

router.register(r'game-instances', GameInstanceViewSet)
router.register(r'team-instances', TeamInstanceViewSet)
router.register(r'role-instances', RoleInstanceViewSet)
router.register(r'unit-instances', UnitInstanceViewSet)
router.register(r'landmark-instances', LandmarkInstanceViewSet)
router.register(r'landmark-instance-tiles', LandmarkInstanceTileViewSet)


urlpatterns = [
    path('api/game-instances/<str:join_code>/main-map/', get.main_map, name='main_map'),
    path('api/game-instances/<str:join_code>/validate-map-access/', get.validate_map_access, name='validate-map-access'),

    path('api/teams/<str:name>/', get.get_team_by_name, name='get_team_by_name'),
    path('api/roles/<str:name>/', get.get_role_by_name, name='get_role_by_name'),
    path('api/units/<str:unit_name>/attacks/<str:attack_name>/', get.get_attack_by_unit_and_name, name='get_attack_by_unit_and_name'),
    path('api/units/<str:unit_name>/abilities/<str:ability_name>/', get.get_ability_by_unit_and_name, name='get_ability_by_unit_and_name'),
    path('api/units/<str:unit_name>/', get.get_unit_by_name, name='get_unit_by_name'),
    path('api/landmarks/<str:name>/', get.get_landmark_by_name, name='get_landmark_by_name'),
    path('api/tiles/<int:row>/<int:column>/', get.get_tile_by_coords, name='get_tile_by_coords'),

    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/', get.get_game_team_instance_by_name, name='get_game_team_instance_by_name'),
    path('api/game-instances/<str:join_code>/role-instances/', get.get_game_role_instances, name='get_game_role_instances'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/role-instances/', get.get_game_role_instances_by_team, name='get_role_instance_by_team'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/role-instances/<str:role_name>/', get.get_game_role_instances_by_team_and_role, name='get_role_instance_by_team_and_role'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/role/<str:role_name>/points/', get.get_game_team_instance_role_points, name='get_game_team_instance_role_points'),
    path('api/game-instances/<str:join_code>/unit-instances/', get.get_game_unit_instances, name='get_game_unit_instances'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/unit-instances/', get.get_game_unit_instances_by_team_name, name='get_game_unit_instances_by_team_name'),
    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/branch/<str:branch>/unit-instances/', get.get_game_unit_instances_by_team_name_and_branch, name='get.get_game_unit_instances_by_team_name_and_branch'),
    path('api/game-instances/<str:join_code>/landmark-instances/<int:pk>/tiles/', get.get_game_tiles_for_landmark_instance_by_id, name='get_tiles_for_landmark_instance_by_id'),
    path('api/game-instances/<str:join_code>/tiles/<int:row>/<int:column>/landmark-instances/', get.get_game_landmark_instances_for_tile_by_coords, name='get_landmark_instances_for_tile_by_coords'),

    path('api/game-instances/create/', post.create_game_instance, name='create_game_instance'),
    path('api/role-instances/create/', post.create_role_instance, name='create_role_instance'),
    path('api/unit-instances/create/', post.create_unit_instance, name='create_unit_instance'),

    path('api/game-instances/<str:join_code>/team-instances/<str:team_name>/role/<str:role_name>/points/send/', patch.send_points, name='send_points'),
    path('api/unit-instances/<int:pk>/move/tiles/<int:row>/<int:column>/', patch.move_unit_instance, name='move_unit_instance'),
    path('api/unit-instances/<int:pk>/attacks/<str:attack_name>/use/', patch.use_attack, name='use_attack'),

    path('api/game-instances/delete/<str:join_code>/', delete.delete_game_instance, name='delete_game_instance'),

    path('api/', include(router.urls)),
]