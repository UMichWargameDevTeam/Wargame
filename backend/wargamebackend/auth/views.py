from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from auth.authentication import CookieJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenObtainPairView,
    TokenRefreshView
)
from wargamebackend.settings import DEBUG


class RegisterView(APIView):
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
            samesite="Lax",
        )

        response.set_cookie(
            "refresh_token",
            str(refresh),
            httponly=True,
            secure=not DEBUG,
            samesite="Lax",
        )

        return response


class CookieTokenObtainPairView(TokenObtainPairView):
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
                samesite="Lax",
            )
            response.set_cookie(
                "refresh_token",
                refresh,
                httponly=True,
                secure=not DEBUG,
                samesite="Lax",
            )

        return response


class CookieTokenRefreshView(TokenRefreshView):
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
                samesite="Lax",
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
    def post(self, request):
        response = Response({"detail": "Logged out"})
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")
        return response