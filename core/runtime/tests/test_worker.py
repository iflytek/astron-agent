import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import select

from agent_runtime.db.models import (
    AgentRelease,
    AgentRun,
    Approval,
    MaterialDraft,
    OutboxMessage,
    RunEvent,
    RunStatus,
    ToolCall,
)
from agent_runtime.db.session import SessionLocal
from agent_runtime.main import create_app
from agent_runtime.services.adapters import _resolve_model_credential
from agent_runtime.services.plan_execute import initial_plan
from agent_runtime.settings import Settings
from agent_runtime.worker.outbox import recover_orphaned_queued_runs
from agent_runtime.worker.tasks import execute_run
from tests.test_runtime_api import (
    INTERNAL_KEY,
    bootstrap,
    create_run,
    delegation_token,
    gateway_headers,
)


def test_worker_persists_result_and_terminal_event(monkeypatch: Any) -> None:
    client = TestClient(create_app())
    bootstrap(client)
    run_id = create_run(client).json()["run_id"]

    async def fake_execute(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        return {"content": "completed"}

    monkeypatch.setattr("agent_runtime.worker.tasks.execute_release", fake_execute)

    execute_run.run(run_id)

    with SessionLocal() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        assert run.status == RunStatus.SUCCEEDED.value
        assert run.result_data == {"content": "completed"}
        event_types = session.scalars(
            select(RunEvent.event_type)
            .where(RunEvent.run_id == run_id)
            .order_by(RunEvent.id)
        ).all()
        assert event_types == ["run.queued", "run.started", "run.completed"]


def test_orphaned_queued_run_is_redispatched_from_postgres() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        run.updated_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        outbox = session.scalar(
            select(OutboxMessage).where(
                OutboxMessage.payload["run_id"].as_string() == run_id
            )
        )
        assert outbox is not None
        outbox.status = "PUBLISHED"

    assert recover_orphaned_queued_runs(300) == 1

    with SessionLocal() as session:
        pending = session.scalars(
            select(OutboxMessage).where(OutboxMessage.status == "PENDING")
        ).all()
        assert len(pending) == 1
        event_types = session.scalars(
            select(RunEvent.event_type)
            .where(RunEvent.run_id == run_id)
            .order_by(RunEvent.id)
        ).all()
        assert event_types == ["run.queued", "run.redispatched"]


def test_plan_execute_persists_step_boundaries(monkeypatch: Any) -> None:
    client = TestClient(create_app())
    bootstrap(client, mode="plan_execute")
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        release = session.get(AgentRelease, run.release_id)
        assert release is not None
        release.snapshot = {
            **release.snapshot,
            "plan": [
                {"id": "research", "instruction": "Research the product"},
                {"id": "draft", "instruction": "Draft the copy"},
            ],
        }

    async def fake_agent(
        _release: Any, step_run: AgentRun, _settings: Any
    ) -> dict[str, Any]:
        return {"content": f"done: {step_run.input_data['question']}"}

    monkeypatch.setattr(
        "agent_runtime.services.plan_execute._execute_agent", fake_agent
    )

    execute_run.run(run_id)

    with SessionLocal() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        assert run.status == RunStatus.SUCCEEDED.value
        assert run.result_data is not None
        assert [item["step_id"] for item in run.result_data["steps"]] == [
            "research",
            "draft",
        ]
        event_types = session.scalars(
            select(RunEvent.event_type)
            .where(RunEvent.run_id == run_id)
            .order_by(RunEvent.id)
        ).all()
        assert event_types == [
            "run.queued",
            "run.started",
            "step.started",
            "step.completed",
            "step.started",
            "step.completed",
            "run.completed",
        ]


def test_plan_execute_does_not_accept_tool_plan_from_run_input() -> None:
    release = AgentRelease(
        agent_id="agent-1",
        space_id="space-1",
        version="1.0.0",
        mode="plan_execute",
        snapshot={"plan": [{"id": "safe", "instruction": "Use published plan"}]},
    )
    run = AgentRun(
        agent_id="agent-1",
        release_id="release-1",
        release_version="1.0.0",
        mode="plan_execute",
        app_id="app-1",
        space_id="space-1",
        end_user_id="user-1",
        delegation_issuer="issuer-1",
        delegation_jti="token-1",
        input_data={
            "plan": [
                {
                    "id": "untrusted",
                    "tool": "commerce_material_draft_save",
                    "arguments": {},
                }
            ]
        },
        idempotency_key="request-1",
        request_hash="hash",
    )

    assert initial_plan(release, run) == [
        {"id": "safe", "instruction": "Use published plan"}
    ]


def test_model_credential_reference_is_resolved_only_for_internal_request() -> None:
    captured: dict[str, Any] = {}

    def resolve(request: httpx.Request) -> httpx.Response:
        captured["request"] = request
        return httpx.Response(200, json={"api_key": "ephemeral-secret"})

    request: dict[str, Any] = {
        "model_config": {
            "domain": "custom-model",
            "credential_ref": {
                "type": "console_model",
                "model_id": 7,
                "owner_uid": "owner-1",
                "space_id": 42,
            },
        }
    }
    settings = Settings(
        internal_api_key="i" * 32,
        console_hub_url="http://console-hub:8080",
    )

    async def run() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(resolve)) as client:
            await _resolve_model_credential(request, settings, client)

    asyncio.run(run())

    assert request["model_config"]["api_key"] == "ephemeral-secret"
    assert "credential_ref" not in request["model_config"]
    outbound = captured["request"]
    assert outbound.headers["X-Runtime-Internal-Key"] == "i" * 32
    assert outbound.url.params["ownerUid"] == "owner-1"
    assert outbound.url.params["spaceId"] == "42"


def test_draft_tool_waits_for_approval_and_only_saves_pending_draft() -> None:
    client = TestClient(create_app())
    release = client.post(
        "/internal/v1/agent-releases",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
        json={
            "agent_id": "agent-1",
            "space_id": "space-1",
            "version": "1.0.0",
            "mode": "plan_execute",
            "snapshot": {
                "plan": [
                    {
                        "id": "save-draft",
                        "tool": "commerce_material_draft_save",
                        "arguments": {
                            "product_id": "$input.product_id",
                            "content": "$input.content",
                        },
                    }
                ]
            },
        },
    )
    assert release.status_code == 201, release.text
    binding = client.post(
        "/internal/v1/app-bindings",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
        json={
            "app_id": "app-1",
            "agent_id": "agent-1",
            "space_id": "space-1",
        },
    )
    assert binding.status_code == 201, binding.text
    path = "/openapi/v1/agents/agent-1/runs"
    headers = gateway_headers("POST", path)
    headers.update(
        {"X-End-User-Token": delegation_token(), "Idempotency-Key": "draft-1"}
    )
    response = client.post(
        path,
        headers=headers,
        json={
            "input": {
                "product_id": "product-1",
                "content": {"title": "Draft title", "body": "Draft body"},
            }
        },
    )
    run_id = response.json()["run_id"]

    execute_run.run(run_id)

    with SessionLocal() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        assert run.status == RunStatus.WAITING_APPROVAL.value
        approval = session.scalar(select(Approval).where(Approval.run_id == run_id))
        assert approval is not None
        approval_id = approval.id
        assert session.scalar(select(MaterialDraft)) is None

    decision_path = f"/openapi/v1/approvals/{approval_id}/decision"
    decision_headers = gateway_headers("POST", decision_path)
    decision_headers["X-End-User-Token"] = delegation_token(roles=["space_admin"])
    decision = client.post(
        decision_path,
        headers=decision_headers,
        json={"decision": "APPROVED", "reason": "Reviewed preview"},
    )
    assert decision.status_code == 200, decision.text
    execute_run.run(run_id)

    with SessionLocal() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        assert run.status == RunStatus.SUCCEEDED.value
        drafts = session.scalars(select(MaterialDraft)).all()
        assert len(drafts) == 1
        assert drafts[0].status == "PENDING_PUBLISH"
        assert drafts[0].product_id == "product-1"
        assert drafts[0].content["title"] == "Draft title"
        assert drafts[0].logical_operation_id.startswith(f"{run_id}:")
        assert len(session.scalars(select(ToolCall)).all()) == 1
