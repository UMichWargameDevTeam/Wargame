from django.urls import re_path
from .consumers import (
    MainMapConsumer, UnitInstanceConsumer, TimerConsumer, GameUsersConsumer
)

websocket_urlpatterns = [
    re_path(r'ws/mainmap/$', MainMapConsumer.as_asgi()),
    re_path(r"ws/unit-instances/$", UnitInstanceConsumer.as_asgi()),
    re_path(r"ws/timer/$", TimerConsumer.as_asgi()),
    re_path(r"ws/game/(?P<game_id>[^/]+)/$", GameUsersConsumer.as_asgi())
]
