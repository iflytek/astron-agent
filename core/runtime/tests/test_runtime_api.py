import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from agent_runtime.db.models import (
    AgentRelease,
    AgentRun,
    Approval,
    OutboxMessage,
    RunEvent,
    RunStatus,
)
from agent_runtime.db.session import SessionLocal
from agent_runtime.main import create_app
from agent_runtime.services.adapters import RunNotResumableError
from agent_runtime.services.plan_execute import _assert_run_can_continue

GATEWAY_SECRET = "g" * 32
INTERNAL_KEY = "i" * 32
DELEGATION_SECRET = "delegation-test-secret-32-bytes!!"


def gateway_headers(method: str, path: str, app_id: str = "app-1") -> dict[str, str]:
    timestamp = str(int(time.time()))
    payload = f"{method}\n{path}\n{app_id}\n{timestamp}".encode()
    signature = hmac.new(GATEWAY_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return {
        "X-Consumer-Username": app_id,
        "X-Workflow-Gateway-Timestamp": timestamp,
        "X-Workflow-Gateway-Signature": signature,
    }


def delegation_token(
    *,
    app_id: str = "app-1",
    space_id: str = "space-1",
    subject: str = "user-1",
    scopes: str = "agent:*",
    roles: list[str] | None = None,
) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "iss": "test-issuer",
            "aud": "astron-agent-runtime",
            "sub": subject,
            "app_id": app_id,
            "space_id": space_id,
            "scope": scopes,
            "roles": roles or ["business_user"],
            "iat": now,
            "exp": now + 300,
            "jti": f"token-{app_id}-{space_id}-{subject}",
        },
        DELEGATION_SECRET,
        algorithm="HS256",
        headers={"kid": "test-key"},
    )


def bootstrap(client: TestClient, *, mode: str = "workflow") -> str:
    snapshot: dict[str, Any]
    if mode == "workflow":
        snapshot = {"workflow": {"flow_id": "flow-1", "version": "1.0.0"}}
    else:
        snapshot = {
            "agent_request": {
                "model_config": {
                    "domain": "model",
                    "api": "http://model",
                    "api_key": "",
                },
                "instruction": {"reasoning": "", "answer": ""},
                "plugin": {},
                "max_loop_count": 3,
            }
        }
    response = client.post(
        "/internal/v1/agent-releases",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
        json={
            "agent_id": "agent-1",
            "space_id": "space-1",
            "version": "1.0.0",
            "mode": mode,
            "snapshot": snapshot,
            "is_default": True,
        },
    )
    assert response.status_code == 201, response.text
    release_id = response.json()["release_id"]
    response = client.post(
        "/internal/v1/app-bindings",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
        json={
            "app_id": "app-1",
            "agent_id": "agent-1",
            "space_id": "space-1",
        },
    )
    assert response.status_code == 201, response.text
    return release_id


def create_run(
    client: TestClient, *, key: str = "request-1", value: str = "hello"
) -> Any:
    path = "/openapi/v1/agents/agent-1/runs"
    headers = gateway_headers("POST", path)
    headers.update({"X-End-User-Token": delegation_token(), "Idempotency-Key": key})
    return client.post(path, headers=headers, json={"input": {"question": value}})


def test_create_run_is_transactional_and_idempotent() -> None:
    client = TestClient(create_app())
    bootstrap(client)

    first = create_run(client)
    second = create_run(client)

    assert first.status_code == 202
    assert first.json()["run_id"] == second.json()["run_id"]
    with SessionLocal() as session:
        assert len(session.scalars(select(AgentRun)).all()) == 1
        assert len(session.scalars(select(OutboxMessage)).all()) == 1
        events = session.scalars(select(RunEvent)).all()
        assert [event.event_type for event in events] == ["run.queued"]


def test_release_snapshot_binds_runtime_code_version() -> None:
    client = TestClient(create_app())
    release_id = bootstrap(client)

    with SessionLocal() as session:
        release = session.get(AgentRelease, release_id)
        assert release is not None
        assert release.snapshot["_runtime"] == {"version": "dev"}


def test_plan_resume_rejects_a_different_runtime_code_version() -> None:
    client = TestClient(create_app())
    release_id = bootstrap(client, mode="plan_execute")
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        release = session.get(AgentRelease, release_id)
        assert run is not None
        assert release is not None
        run.attempt = 2
        release.snapshot = {**release.snapshot, "_runtime": {"version": "old"}}

    with pytest.raises(RunNotResumableError, match="RUN_NOT_RESUMABLE"):
        _assert_run_can_continue(run_id, release_id, "dev")


def test_idempotency_key_rejects_changed_request() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    assert create_run(client, value="first").status_code == 202

    response = create_run(client, value="changed")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_delegation_token_cannot_create_a_second_run() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    assert create_run(client, key="first-run").status_code == 202

    response = create_run(client, key="second-run")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DELEGATION_REPLAYED"


def test_cross_space_delegation_is_rejected() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    path = "/openapi/v1/agents/agent-1/runs"
    headers = gateway_headers("POST", path)
    headers.update(
        {
            "X-End-User-Token": delegation_token(space_id="space-2"),
            "Idempotency-Key": "cross-space",
        }
    )

    response = client.post(path, headers=headers, json={"input": {"question": "x"}})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AGENT_NOT_AUTHORIZED"


def test_run_cannot_be_read_by_another_end_user() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    run_id = create_run(client).json()["run_id"]
    path = f"/openapi/v1/runs/{run_id}"
    headers = gateway_headers("GET", path)
    headers["X-End-User-Token"] = delegation_token(subject="user-2")

    response = client.get(path, headers=headers)

    assert response.status_code == 403


def test_idempotency_key_cannot_cross_end_users() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    assert create_run(client, key="shared-key").status_code == 202
    path = "/openapi/v1/agents/agent-1/runs"
    headers = gateway_headers("POST", path)
    headers.update(
        {
            "X-End-User-Token": delegation_token(subject="user-2"),
            "Idempotency-Key": "shared-key",
        }
    )

    response = client.post(path, headers=headers, json={"input": {"question": "hello"}})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"


def test_disabling_release_cancels_waiter_and_blocks_resume() -> None:
    client = TestClient(create_app())
    release_id = bootstrap(client)
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        run.status = RunStatus.WAITING_INPUT.value

    response = client.post(
        f"/internal/v1/agent-releases/{release_id}/disable",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
    )
    assert response.status_code == 200

    path = f"/openapi/v1/runs/{run_id}/resume"
    headers = gateway_headers("POST", path)
    headers["X-End-User-Token"] = delegation_token()
    response = client.post(path, headers=headers, json={"input": {"answer": "ok"}})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "RELEASE_DISABLED"
    with SessionLocal() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        assert run.status == RunStatus.CANCELLED_BY_RELEASE.value


def test_approval_requires_policy_role() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        run.status = RunStatus.WAITING_APPROVAL.value
        approval = Approval(
            run_id=run.id,
            operation_id="draft-save-1",
            parameter_hash="hash",
            policy={"allowed_roles": ["space_admin"]},
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        session.add(approval)
        session.flush()
        approval_id = approval.id

    path = f"/openapi/v1/approvals/{approval_id}/decision"
    headers = gateway_headers("POST", path)
    headers["X-End-User-Token"] = delegation_token(roles=["business_user"])
    denied = client.post(path, headers=headers, json={"decision": "APPROVED"})
    assert denied.status_code == 403

    headers["X-End-User-Token"] = delegation_token(roles=["space_admin"])
    approved = client.post(path, headers=headers, json={"decision": "APPROVED"})
    assert approved.status_code == 200
    assert approved.json()["status"] == RunStatus.QUEUED.value


def test_space_admin_can_approve_another_users_run() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        run.status = RunStatus.WAITING_APPROVAL.value
        approval = Approval(
            run_id=run.id,
            operation_id="draft-save-admin",
            parameter_hash="hash",
            policy={"allowed_roles": ["space_admin"]},
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        session.add(approval)
        session.flush()
        approval_id = approval.id

    path = f"/openapi/v1/approvals/{approval_id}/decision"
    headers = gateway_headers("POST", path)
    headers["X-End-User-Token"] = delegation_token(
        subject="admin-1",
        scopes="approvals:decide",
        roles=["space_admin"],
    )

    response = client.post(path, headers=headers, json={"decision": "APPROVED"})

    assert response.status_code == 200
    assert response.json()["status"] == RunStatus.QUEUED.value


def test_business_user_cannot_approve_another_users_run() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        run.status = RunStatus.WAITING_APPROVAL.value
        approval = Approval(
            run_id=run.id,
            operation_id="draft-save-other-user",
            parameter_hash="hash",
            policy={"allowed_roles": ["business_user", "space_admin"]},
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        session.add(approval)
        session.flush()
        approval_id = approval.id

    path = f"/openapi/v1/approvals/{approval_id}/decision"
    headers = gateway_headers("POST", path)
    headers["X-End-User-Token"] = delegation_token(
        subject="user-2",
        scopes="approvals:decide",
        roles=["business_user"],
    )

    response = client.post(path, headers=headers, json={"decision": "APPROVED"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AGENT_NOT_AUTHORIZED"


def test_expired_approval_finalizes_the_waiting_run() -> None:
    client = TestClient(create_app())
    bootstrap(client)
    run_id = create_run(client).json()["run_id"]
    with SessionLocal.begin() as session:
        run = session.get(AgentRun, run_id)
        assert run is not None
        run.status = RunStatus.WAITING_APPROVAL.value
        approval = Approval(
            run_id=run.id,
            operation_id="expired-draft-save",
            parameter_hash="hash",
            policy={"allowed_roles": ["space_admin"]},
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
        )
        session.add(approval)
        session.flush()
        approval_id = approval.id

    path = f"/openapi/v1/approvals/{approval_id}/decision"
    headers = gateway_headers("POST", path)
    headers["X-End-User-Token"] = delegation_token(roles=["space_admin"])

    response = client.post(path, headers=headers, json={"decision": "APPROVED"})

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "APPROVAL_INVALID"
    with SessionLocal() as session:
        run = session.get(AgentRun, run_id)
        stored_approval = session.get(Approval, approval_id)
        assert run is not None
        assert stored_approval is not None
        assert run.status == RunStatus.EXPIRED.value
        assert run.error_code == "APPROVAL_EXPIRED"
        assert stored_approval.status == "EXPIRED"


def test_release_rejects_production_publish_tool() -> None:
    client = TestClient(create_app())

    response = client.post(
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
                        "id": "publish",
                        "tool": "commerce_product_publish",
                        "arguments": {},
                    }
                ]
            },
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INPUT_INVALID"


def test_release_cannot_disable_governed_tool_approval() -> None:
    client = TestClient(create_app())

    response = client.post(
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
                        "requires_approval": False,
                        "arguments": {},
                    }
                ]
            },
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INPUT_INVALID"


def test_release_rejects_cross_space_model_credential_reference() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/internal/v1/agent-releases",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
        json={
            "agent_id": "agent-1",
            "space_id": "space-1",
            "version": "1.0.0",
            "mode": "chat",
            "snapshot": {
                "agent_request": {
                    "model_config": {
                        "credential_ref": {
                            "type": "console_model",
                            "model_id": 7,
                            "owner_uid": "owner-1",
                            "space_id": "space-2",
                        }
                    }
                }
            },
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INPUT_INVALID"


def test_release_rejects_camel_case_embedded_secret() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/internal/v1/agent-releases",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
        json={
            "agent_id": "agent-1",
            "space_id": "space-1",
            "version": "1.0.0",
            "mode": "chat",
            "snapshot": {
                "agent_request": {"model_config": {"apiKey": "must-not-be-published"}}
            },
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INPUT_INVALID"


def test_release_rejects_missing_mode_snapshot() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/internal/v1/agent-releases",
        headers={"X-Runtime-Internal-Key": INTERNAL_KEY},
        json={
            "agent_id": "agent-1",
            "space_id": "space-1",
            "version": "1.0.0",
            "mode": "workflow",
            "snapshot": {},
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INPUT_INVALID"
