from django.urls import path
from . import views

urlpatterns = [
    path('redcommander/', views.red_commander, name='red_commander'),
    path('bluecommander/', views.blue_commander, name='blue_commander'),
    path('redfield/', views.red_field, name='red_field'),
    path('bluefield/', views.blue_field, name='blue_field'),
]