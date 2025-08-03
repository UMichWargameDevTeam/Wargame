"""
ASGI config for wargamebackend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django
import datetime
import threading
import asyncio
from channels.layers import get_channel_layer
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import wargamelogic.routing
from wargamelogic.consumers import TimerConsumer


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wargamebackend.settings")
django.setup()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(wargamelogic.routing.websocket_urlpatterns)
    ),
})

def start_timer_broadcast():
    async def broadcast():
        layer = get_channel_layer()
        while True:
            elapsed = (datetime.datetime.utcnow() - TimerConsumer.start_time).total_seconds()
            remaining = max(TimerConsumer.timer_duration - int(elapsed), 0)
            await layer.group_send(
                "global_timer",
                {
                    "type": "send_time_update",
                    "remaining_seconds": remaining,
                }
            )
            if remaining == 0:
                break
            await asyncio.sleep(1)

    asyncio.run(broadcast())

threading.Thread(target=start_timer_broadcast, daemon=True).start()
