"""Deletion guards for references stored in Python drafts and immutable versions."""

from django.core.exceptions import ValidationError

from .common import parsed


def ensure_definition_unreferenced(kind, identifiers):
    from astron_console.agents.definitions import definition
    from astron_console.agents.models import Agent, AgentVersion
    from astron_console.workflows.models import Workflow, WorkflowVersion

    identifiers = {str(value) for value in identifiers if value not in (None, "")}
    fields = {
        "tool": {"tools", "pluginId", "toolId", "tool_id"},
        "repo": {"repoIds", "repoId", "knowledge"},
    }[kind]
    message = {"tool": "工具", "repo": "知识库"}[kind] + "仍被 Agent 或工作流引用，无法删除"

    def matches(value):
        if isinstance(value, list):
            return any(matches(item) for item in value)
        if isinstance(value, dict):
            return any(matches(value[key]) for key in fields | {"id"} if key in value)
        return not isinstance(value, bool) and str(value) in identifiers

    def check(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in fields and matches(item):
                    raise ValidationError(message)
                check(item)
        elif isinstance(value, list):
            for item in value:
                check(item)

    agents = Agent.objects.filter(is_delete=0, version=1)
    for agent in agents.iterator():
        # Use the same retained MAAS dataset and Python state precedence as execution.
        check(definition(agent))
    for config in (
        AgentVersion.objects.filter(agent_id__in=agents.values("pk"))
        .values_list("definition", flat=True)
        .iterator()
    ):
        check(config)
    for workflow in (
        Workflow.objects.filter(deleted=False).only("flow_id", "data", "published_data").iterator()
    ):
        check(parsed(workflow.data))
        check(parsed(workflow.published_data))
        if workflow.flow_id:
            # Compare IDs to values, not across retained tables with different collations.
            for data in (
                WorkflowVersion.objects.filter(flow_id=workflow.flow_id, is_deleted=0)
                .exclude(deleted=2)
                .values_list("data", flat=True)
                .iterator()
            ):
                check(parsed(data))
