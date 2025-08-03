from django.urls import re_path
from . import consumers
from wargamelogic.consumers import AssetConsumer


websocket_urlpatterns = [
    re_path(r'ws/mainmap/$', consumers.MainMapConsumer.as_asgi()),
    re_path(r"ws/assets/$", AssetConsumer.as_asgi()),
]
