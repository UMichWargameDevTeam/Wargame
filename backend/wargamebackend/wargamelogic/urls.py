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
    TileInstanceViewSet,
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
router.register(r'tile-instances', TileInstanceViewSet)

urlpatterns = [
    path('api/mainmap/', views.main_map, name='main_map'),
    path('api/register_role/', views.register_role, name='register_role'),
    path('api/', include(router.urls)),

] 