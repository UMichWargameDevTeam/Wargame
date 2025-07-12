from django.urls import path
from . import views

urlpatterns = [
    path('api/mainmap/', views.main_map, name='main_map'),
    #path('bluecommander/', views.blue_commander, name='blue_commander'),
    #path('redfield/', views.red_field, name='red_field'),
    #path('bluefield/', views.blue_field, name='blue_field'),
]