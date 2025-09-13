from django.urls import path
from auth.views import (
    RegisterView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    MeView,
    LogoutView
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("logout/", LogoutView.as_view(), name="logout"),
]