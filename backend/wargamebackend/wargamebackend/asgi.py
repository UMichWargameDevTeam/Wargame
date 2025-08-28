"""
ASGI config for wargamebackend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wargamebackend.settings")
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from auth.middleware import JWTAuthMiddleware
import wargamelogic.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(wargamelogic.routing.websocket_urlpatterns)
    ),
})

