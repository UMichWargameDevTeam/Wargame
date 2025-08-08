from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
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
    path('api/mainmap/', views.main_map, name='main_map'),
    path('api/register_role/', views.register_role, name='register_role'),

    path('api/teams/<str:name>/', views.get_team_by_name, name='get_team_by_name'),
    path('api/roles/<str:name>/', views.get_role_by_name, name='get_role_by_name'),
    path('api/units/<str:unit_name>/attacks/<str:attack_name>/', views.get_attack_by_unit_and_name, name='get_attack_by_unit_and_name'),
    path('api/units/<str:unit_name>/abilities/<str:ability_name>/', views.get_ability_by_unit_and_name, name='get_ability_by_unit_and_name'),
    path('api/units/<str:unit_name>/', views.get_unit_by_name, name='get_unit_by_name'),
    path('api/landmarks/<str:name>/', views.get_landmark_by_name, name='get_landmark_by_name'),
    path('api/tiles/<int:row>/<int:column>/', views.get_tile_by_coords, name='get_tile_by_coords'),

    path('api/role-instances/<str:team_name>/<str:role_name>/', views.get_role_instances_by_team_and_role, name='get_role_instance_by_team_and_role'),
    path('api/landmark-instances/<int:pk>/tiles/', views.get_tiles_for_landmark_instance_by_id, name='get_tiles_for_landmark_instance_by_id'),
    path('api/tiles/<int:row>/<int:column>/landmark-instances/', views.get_landmark_instances_for_tile_by_coords, name='get_landmark_instances_for_tile_by_coords'),

    path('api/game/move-unit', views.move_unit, name='move_unit'),

    path('api/', include(router.urls)),
]