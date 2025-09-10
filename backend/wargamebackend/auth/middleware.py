from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.conf import settings
import jwt

# For WebSocket authentication, I had ChatGPT generate this custom authentication
# as opposed to the built-in AuthMiddlewareStack because that used sessions instead of JWT.
# It made sense to make its authentication work the same way as it does for DRF,
# i.e using JWT. This way, scope["user"] in a consumer should work the same way 
# as request.user in DRF.
class JWTAuthMiddleware:
    def __init__(self, app):
        """
        Initialize the middleware with the wrapped ASGI application.
        
        Parameters:
            app: The inner ASGI application callable to which the middleware will delegate
                 after attaching authentication information to the connection scope.
        """
        self.app = app

    async def __call__(self, scope, receive, send):
        # Parse token from query string
        """
        Authenticate an incoming ASGI connection by extracting a JWT from the connection's query string and setting scope["user"] accordingly.
        
        If a "token" parameter is present in scope["query_string"], the token is decoded using settings.SECRET_KEY with the HS256 algorithm and the user is looked up by payload["user_id"] via an asynchronous DB call; on success scope["user"] is set to that User instance. If no token is present or any validation/lookup step fails, scope["user"] is set to django.contrib.auth.models.AnonymousUser(). After setting scope["user"], control is delegated to the wrapped ASGI application and its result is returned.
        """
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
