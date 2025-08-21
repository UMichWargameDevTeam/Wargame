from django.urls import path
from .consumers import (
    MainMapConsumer, UnitInstanceConsumer, TimerConsumer, GameUsersConsumer
)

websocket_urlpatterns = [
    path("ws/game-instances/<str:join_code>/users/", GameUsersConsumer.as_asgi()),
    path("ws/game-instances/<str:join_code>/mainmap/", MainMapConsumer.as_asgi()),
    path("ws/game-instances/<str:join_code>/unit-instances/", UnitInstanceConsumer.as_asgi()),
    path("ws/game-instances/<str:join_code>/global-timer/", TimerConsumer.as_asgi()),
]
