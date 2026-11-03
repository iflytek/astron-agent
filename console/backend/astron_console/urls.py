from django.http import JsonResponse
from django.urls import path

from astron_console.accounts import views

urlpatterns = [
    path("health", lambda request: JsonResponse({"status": "ok", "service": "astron-console"})),
    path("auth/csrf", views.csrf_token),
    path("auth/register", views.register),
    path("auth/login", views.login_view),
    path("auth/logout", views.logout_view),
    path("auth/reset-password", views.reset_password),
    path("auth/change-password", views.change_password),
    path("user-info/me", views.me),
    path("user-info/update", views.update_profile),
    path("user-info/agreement", views.agreement),
]
