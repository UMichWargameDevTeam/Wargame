from django.urls import re_path
from wargamelogic.consumers import (
    GameConsumer
)

websocket_urlpatterns = [
    re_path(r"^ws/game-instances/(?P<join_code>[A-Za-z0-9\-.]{1,100})/$", GameConsumer.as_asgi())
]
