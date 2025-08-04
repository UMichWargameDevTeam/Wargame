from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import UnitViewSet, UnitInstanceViewSet

router = DefaultRouter()
router.register(r'units', UnitViewSet)
router.register(r'unit-instances', UnitInstanceViewSet)

urlpatterns = [
    path('api/mainmap/', views.main_map, name='main_map'),
    path('api/register_role/', views.register_role, name='register_role'),
    path('api/', include(router.urls)),

] 