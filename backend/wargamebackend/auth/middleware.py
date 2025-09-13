from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from channels.db import database_sync_to_async
from http.cookies import SimpleCookie

# For WebSocket authentication, I had ChatGPT generate this custom authentication
# as opposed to the built-in AuthMiddlewareStack because that used sessions instead of JWT.
# It made sense to make its authentication work the same way as it does for DRF,
# i.e using JWT. This way, scope["user"] in a consumer should work the same way 
# as request.user in DRF.
class JWTAuthMiddleware:
    """
    WebSocket middleware that authenticates users via JWT stored in cookies,
    using SimpleJWT for validation (like DRF).
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        headers = {k.decode().lower(): v.decode() for k, v in scope["headers"]}
        cookie_header = headers.get("cookie", "")
        cookies = SimpleCookie()
        cookies.load(cookie_header)
        token = cookies.get("access_token").value if "access_token" in cookies else None

        if token:
            try:
                UntypedToken(token)  # Raises InvalidToken if invalid or expired
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)

                User = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                scope["user"] = User
            except (InvalidToken, TokenError, Exception):
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await self.app(scope, receive, send)