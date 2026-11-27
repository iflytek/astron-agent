from django.urls import include, path

from . import conversations, files, internal, resource_resolution, steering

urlpatterns = [
    path("", include("astron_console.agents.definition_urls")),
    path("agents/internal/resolve", internal.resolve),
    path("agents/internal/runs/<str:run_id>/steering", steering.boundary),
    path("agents/artifacts/internal-upload", files.internal_upload),
    path("agents/<int:agent_id>/resources", resource_resolution.resources),
    path("agents/<int:agent_id>/sessions", conversations.sessions),
    path("agents/<int:agent_id>/sessions/<str:session_id>", conversations.session_item),
    path("agents/<int:agent_id>/sessions/<str:session_id>/messages", conversations.messages),
    path("agents/<int:agent_id>/sessions/<str:session_id>/stream", conversations.execute),
    path(
        "agents/<int:agent_id>/sessions/<str:session_id>/runs/<str:run_id>/steering", steering.steer
    ),
    path("agents/<int:agent_id>/runs/<str:run_id>/stop", conversations.stop),
    path("agents/<int:agent_id>/files", files.upload),
    path("agents/<int:agent_id>/files/<str:file_id>", files.download),
    path("agents/<int:agent_id>/sandbox-files", files.sandbox_files),
    path("agents/<int:agent_id>/sandbox-files/download", files.sandbox_files, {"download": True}),
    path("agents/<int:agent_id>/sandbox-files/file", files.delete_sandbox_file),
]
