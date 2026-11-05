from django.urls import include, path

from . import internal, text_nodes
from . import runtime_views as views

urlpatterns = [
    path("", include("astron_console.workflows.management_urls")),
    path("workflow/chat", views.chat),
    path("workflow/node/debug/<str:node_id>", views.node_debug),
    path("workflow/code/run", views.code_run),
    path("textNode/config/list", text_nodes.listing),
    path("textNode/config/save", text_nodes.save),
    path("textNode/config/delete", text_nodes.remove),
    path("workflow/resume", views.resume),
    path("workflow/execution-eligibility", views.eligibility),
    path("workflow/dialog/list", views.history),
    path("workflow/statistics", views.statistics),
    path("workflow/runs/<str:run_id>", views.detail),
    path("workflow/runs/<str:run_id>/stop", views.stop),
    path("workflow/runs/<str:run_id>/retry", views.retry),
    path("publish/workflows/<str:flow_id>/trace/executions", views.traces),
    path("publish/workflows/<str:flow_id>/trace/executions/<str:run_id>", views.traces),
    path("workflow/internal/agent-runtime", internal.agent_runtime),
    path("workflow/internal/tool-schema", internal.tool_schema),
    path("workflow/internal/tool-run", internal.tool_run),
    path("workflow/internal/control", internal.control),
    path("workflow/internal/cancel", internal.cancel),
]
