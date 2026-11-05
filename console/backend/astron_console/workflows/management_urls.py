from django.urls import path

from . import automation, templates
from . import management_views as views

urlpatterns = [
    path("workflow", views.collection),
    path("workflow/list", views.listing),
    path("workflow/clone", views.clone),
    path("workflow/build", views.build),
    path("workflow/node-template", views.node_templates),
    path("workflow/get-inputs-info", views.inputs_info),
    path("workflow/get-max-version", views.latest),
    path("workflow/version/list", views.versions),
    path("workflow/version", views.versions),
    path("workflow/version/restore", views.restore),
    path("workflow/dialog", views.dialog),
    path("workflow/dialog/clear", views.clear_dialog),
    path("workflow/export/<int:workflow_id>", templates.export),
    path("workflow/import", templates.import_workflow),
    path("workflow/automation/page", automation.listing),
    path("workflow/automation", automation.item),
    path("workflow/automation/cron/preview", automation.preview),
    path("workflow/automation/<int:task_id>", automation.item),
    path("workflow/automation/<int:task_id>/enable", automation.enable),
    path("workflow/automation/<int:task_id>/runs", automation.runs),
    path("workflow/automation/<int:task_id>/run-now", automation.run_now),
    path("workflow/get-agent-strategy", views.strategies, {"category": "WORKFLOW_AGENT_STRATEGY"}),
    path(
        "workflow/get-knowledge-pro-strategy",
        views.strategies,
        {"category": "WORKFLOW_KNOWLEDGE_PRO_STRATEGY"},
    ),
]
for prefix in ("workflow/bot/", "workflow/"):
    urlpatterns += [
        path(prefix + "templateGroup", templates.groups),
        path(prefix + "templateList", templates.listing),
        path(prefix + "createFromTemplate", templates.create_from_template),
        path(prefix + "exportTemplate", templates.export_template),
        path(prefix + "template/<int:template_id>", templates.delete_template),
    ]
