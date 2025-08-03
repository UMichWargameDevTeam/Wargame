from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, AssetTypeViewSet

router = DefaultRouter()
router.register(r'assets', AssetViewSet)
router.register(r'asset-types', AssetTypeViewSet)

urlpatterns = [
    path('api/mainmap/', views.main_map, name='main_map'),
    path('api/register_role/', views.register_role, name='register_role'),
    path('api/', include(router.urls)),

] 