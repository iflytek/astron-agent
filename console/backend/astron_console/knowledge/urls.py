from django.urls import path

from . import databases, files, views

urlpatterns = [
    path("repo/<str:action>", views.repos),
    path("file/upload", views.upload),
    path("file/<str:action>", views.files),
    path("knowledge/<str:action>", views.chunks),
    path("db/<str:action>", databases.databases),
    path("skill-file", files.skills),
    path("skill-file/<str:action>", files.skills),
    path("api/s3/presign", files.presign),
    path("image/upload", files.image_upload),
    path("image/content/<str:owner>/<str:upload_id>/<str:name>", files.image_content),
    path("workflow/artifacts/internal-upload", files.upload_artifact),
    path("workflow/artifacts/console-upload", files.upload_artifact, {"console": True}),
    path("workflow/<int:workflow_id>/artifacts", files.artifacts),
    path("workflow/artifacts/<int:artifact_id>/download", files.artifacts, {"action": "download"}),
    path("workflow/artifacts/<int:artifact_id>", files.artifacts),
]
