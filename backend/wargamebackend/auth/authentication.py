from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import ExpiredTokenError, InvalidToken, AuthenticationFailed

class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the JWT access token from a cookie.
    """
    def authenticate(self, request):
        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            raise AuthenticationFailed(detail="no_token")

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except ExpiredTokenError:
            raise AuthenticationFailed(detail="expired_token")
        except InvalidToken:
            raise AuthenticationFailed(detail="invalid_token")