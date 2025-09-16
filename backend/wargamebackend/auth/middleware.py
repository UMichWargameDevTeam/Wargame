# The purpose of this file is similar to that of authentication.py,
# but this one is specifically for authenticating WebSocket connections.
# It is used in asgi.py.

from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from channels.db import database_sync_to_async
from http.cookies import SimpleCookie

class CookieJWTAuthenticationWebSocketMiddleware:
    """
    Authentication class for WebSockets that reads the JWT access token from a cookie.
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