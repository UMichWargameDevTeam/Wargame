from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
import jwt

# For websocket authentication, I had chat GPT generate this custom authentication
# as opposed to the built-in AuthMiddlewareStack because that used sessions instead of JWT.
# It made sense to make its authentication work the same way as it does for DRF,
# i.e using JWT. This way, scope["user"] in a consumer should work the same way 
# as request.user in DRF.
class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Parse token from query string
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token", [None])[0]

        if token:
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                from django.contrib.auth import get_user_model
                User = get_user_model()
                user = await database_sync_to_async(User.objects.get)(id=payload["user_id"])
                scope["user"] = user
            except Exception:
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)
