from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

class RegisterView(APIView):
    def post(self, request):
        """
        Handle user registration.
        
        Expects JSON payload with "username" and "password". If either is missing, responds with HTTP 400 and {"error": "Username and password required"}. If the username already exists, responds with HTTP 400 and {"detail": "Username taken"}. On success creates a new Django User, issues JWT refresh and access tokens, and responds with HTTP 201 containing:
        {
          "refresh": "<refresh token>",
          "access": "<access token>"
        }
        """
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username and password required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"detail": "Username taken"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        refresh = RefreshToken.for_user(user)

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
