from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from auth.authentication import CookieJWTAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenObtainPairView,
    TokenRefreshView
)
from wargamebackend.settings import DEBUG


@api_view(["GET"])
def csrf_token(request):
    """
    Returns the CSRF token for use in JS fetch headers.
    """
    token = get_token(request)  # generates or returns existing CSRF token
    return Response({"csrfToken": token})


class RegisterView(APIView):
    """
    data: {
        username: string,
        boolean: string
    }
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username taken"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response({"detail": "User registered"}, status=status.HTTP_201_CREATED)

        response.set_cookie(
            "access_token",
            str(access),
            httponly=True,
            secure=not DEBUG,
            samesite="Lax" if DEBUG else "None",
            max_age=24*60*60,
        )

        response.set_cookie(
            "refresh_token",
            str(refresh),
            httponly=True,
            secure=not DEBUG,
            samesite="Lax" if DEBUG else "None",
            max_age=7*24*60*60,
        )

        return response


class CookieTokenObtainPairView(TokenObtainPairView):
    # The parent class TokenObtainPairView already sets permission_classes to AllowAny,
    # But this makes it more explicit and readable.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        data = response.data

        refresh = data.get("refresh")
        access = data.get("access")

        # Clear JSON payload (optional: you might want to keep it for debugging)
        response.data = {"detail": "Login successful"}

        if refresh and access:
            response.set_cookie(
                "access_token",
                access,
                httponly=True,
                secure=not DEBUG,
                samesite="Lax" if DEBUG else "None",
                max_age=24*60*60,
            )

            response.set_cookie(
                "refresh_token",
                refresh,
                httponly=True,
                secure=not DEBUG,
                samesite="Lax" if DEBUG else "None",
                max_age=7*24*60*60,
            )

        return response


class CookieTokenRefreshView(TokenRefreshView):
    # The parent class TokenRefreshView already sets permission_classes to AllowAny,
    # But this makes it more explicit and readable.
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # Grab refresh token from cookie, not body
        refresh = request.COOKIES.get("refresh_token")
        if not refresh:
            return Response({"detail": "No refresh token"}, status=401)

        request.data["refresh"] = refresh
        response = super().post(request, *args, **kwargs)
        data = response.data

        access = data.get("access")
        if access:
            response.set_cookie(
                "access_token",
                access,
                httponly=True,
                secure=not DEBUG,
                samesite="Lax" if DEBUG else "None",
                max_age=24*60*60,
            )
            response.data = {"detail": "Access token refreshed"}

        return response


class MeView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username
        })


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Logged out"})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response