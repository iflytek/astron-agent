from django.urls import path

from . import views

urlpatterns = [
    path("space/<str:action>", views.spaces),
    path("enterprise/<str:action>", views.enterprises),
    path("space-user/<str:action>", views.members, {"kind": "space"}),
    path("enterprise-user/<str:action>", views.members, {"kind": "enterprise"}),
    path("invite-record/<str:action>", views.invitations),
    path("apply-record/<str:action>", views.applications),
    path("notifications/<str:action>", views.notifications),
]
