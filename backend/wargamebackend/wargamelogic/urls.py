from django.urls import path
from . import views

urlpatterns = [
    path('api/mainmap/', views.main_map, name='main_map'),
    path('api/register_role/', views.register_role, name='register_role'),
    path('api/assets/', views.get_all_assets, name='get_all_assets'),

]