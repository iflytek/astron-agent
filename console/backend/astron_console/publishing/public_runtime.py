"""Published entry points reuse the Console execution services and durable grants."""

import hashlib
import json
import uuid

from asgiref.sync import async_to_sync, sync_to_async
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404, JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt

from astron_console.agents import conversations
from astron_console.agents.models import Agent, AgentFile, AgentRun, AgentSession
from astron_console.agents.resource_resolution import resolve_resources
from astron_console.http import api_endpoint
from astron_console.knowledge.models import Artifact
from astron_console.resources.common import text, upstream_errors
from astron_console.spaces.permissions import resolve_scope
from astron_console.workflows.authorization import EXECUTE, get_workflow
from astron_console.workflows.execution_context import cancel_root, register_agent_root
from astron_console.workflows.lifecycle import claim_run, prepare_run, reconcile, stream_run
from astron_console.workflows.models import ExecutionContext, WorkflowRun

from . import tenant
from .models import Publication, PublicationCandidate, PublicRunGrant, ShareRecord
from .runtime_authorization import check_grant, memory_scope
from .services import candidate_scope, require_publication, require_share, validate_candidate


def external_uid(kind, namespace, subject):
    if not isinstance(subject, str) or not subject or len(subject) > 512:
        raise ValidationError("缺少有效的调用用户标识")
    return kind + ":" + hashlib.sha256(f"{namespace}\0{subject}".encode()).hexdigest()


def browser_publication(request, bot_id):
    values = request.GET if request.method == "GET" else request.payload
    key = values.get("shareKey")
    publication = require_share(key) if key else require_publication(bot_id=bot_id)
    if publication.bot_id != bot_id:
        raise PermissionDenied
    share = ShareRecord.objects.filter(share_key=key, is_act=1).first() if key else None
    return publication, share.pk if share else None


def public_data(publication):
    candidate = publication.candidate
    config = candidate.definition
    result = {
        "id": publication.bot_id,
        "publicationId": publication.pk,
        "kind": candidate.resource_kind,
        "name": config.get("botName", ""),
        "description": config.get("botDesc", ""),
        "avatar": config.get("avatar", ""),
        "prologue": config.get("prologue", ""),
        "supportUpload": bool(config.get("supportUpload")),
        "inputs": [],
    }
    if candidate.resource_kind == "workflow":
        for node in config["graph"].get("nodes", []):
            if str(node.get("id", "")).startswith("node-start::"):
                for item in node.get("data", {}).get("outputs", []):
                    schema = item.get("schema") or {}
                    result["inputs"].append(
                        {
                            "name": item["name"],
                            "type": schema.get("type", "string"),
                            "description": item.get("description", ""),
                            "required": bool(item.get("required", False)),
                        }
                    )
    return result


@api_endpoint(["GET"])
def published_detail(request, bot_id):
    publication, _ = browser_publication(request, bot_id)
    return public_data(publication)


def new_grant(
    publication,
    run_id,
    root_id,
    caller,
    *,
    kind,
    app_id="",
    session_id="",
    caller_space_id=None,
    share_id=None,
):
    return PublicRunGrant.objects.create(
        publication=publication,
        candidate=publication.candidate,
        run_id=run_id,
        root_id=root_id,
        caller_uid=caller,
        identity_kind=kind,
        app_id=app_id,
        session_id=session_id,
        caller_space_id=caller_space_id,
        share_id=share_id,
    )


@transaction.atomic
def prepare_public(
    publication, caller, values, *, kind="console", app_id="", caller_space_id=None, share_id=None
):
    candidate = publication.candidate
    scope = candidate_scope(candidate)
    session_id = values.get("sessionId") or uuid.uuid4().hex
    if not isinstance(session_id, str) or len(session_id) > 96:
        raise ValidationError("会话标识无效")
    # A session key is an opaque client correlation identifier, never an identity credential.
    if candidate.resource_kind == "workflow":
        workflow = get_workflow(scope, candidate.resource_id, EXECUTE)
        inputs = values.get("inputs", values.get("parameters", {}))
        run = prepare_run(
            scope,
            workflow,
            inputs,
            graph=candidate.definition["graph"],
            version_id=candidate.version_id,
            kind="published",
        )
        grant = new_grant(
            publication,
            run.pk,
            run.context_id,
            caller,
            kind=kind,
            app_id=app_id,
            session_id=session_id,
            caller_space_id=caller_space_id,
            share_id=share_id,
        )
        claim_run(run)
        return run, grant, None
    question = text(values, "message", required=True, limit=32000)
    agent = Agent.objects.get(pk=candidate.bot_id, is_delete=0)
    config = candidate.definition
    runtime = resolve_resources(scope, config)
    from .public_files import authorize_inputs, file_data

    uploads = authorize_inputs(publication, caller, caller_space_id, values.get("files", []))
    content = conversations.input_content(question, uploads)
    if len(content) > 200000:
        raise ValidationError("输入总长度超过200000字符")
    existing = PublicRunGrant.objects.filter(
        session_id=session_id,
        caller_uid=caller,
        caller_space_id=caller_space_id,
        identity_kind=kind,
        publication_id=publication.pk,
        app_id=app_id,
    ).first()
    session = None
    if existing:
        session = (
            AgentSession.objects.select_for_update()
            .filter(pk=session_id, kind="published", deleted=False)
            .first()
        )
    if session is None:
        # Never reuse someone else's session, including a colliding caller-supplied ID.
        if AgentSession.objects.filter(pk=session_id).exists():
            raise PermissionDenied
        session = AgentSession.objects.create(
            id=session_id,
            agent_id=agent.pk,
            uid=caller,
            space_id=caller_space_id,
            kind="published",
            title=question[:80],
        )
    conversations.recover_interrupted(session)
    if session.active_run_id:
        raise ValidationError("当前会话仍在生成")
    history = conversations.history_for(session) if config.get("supportContext") else []
    run = AgentRun.objects.create(
        session=session,
        question=question,
        definition=config,
        version_id=candidate.version_id,
        files=[file_data(row) for row in uploads],
    )
    session.active_run_id = run.pk
    session.save(update_fields=["active_run_id"])
    context = register_agent_root(run, agent, scope, config)
    grant = new_grant(
        publication,
        run.pk,
        context["root_id"],
        caller,
        kind=kind,
        app_id=app_id,
        session_id=session_id,
        caller_space_id=caller_space_id,
        share_id=share_id,
    )
    subject_scope = memory_scope(ExecutionContext.objects.get(pk=context["root_id"]), agent)
    prompt = conversations.prompt_for(config)
    payload = {
        **runtime,
        "uid": caller,
        "stream": True,
        "messages": history + [{"role": "user", "content": content}],
        "instruction": {"reasoning": prompt, "answer": prompt},
        "max_loop_count": config.get("maxLoopCount", 5),
        "meta_data": {
            "caller": "console-published",
            "source": kind,
            "agent_id": str(agent.pk),
            "space_id": candidate.space_id,
            "session_id": session.pk,
            "run_id": run.pk,
            "caller_sid": run.pk,
            "console_context": context,
        },
    }
    return run, grant, (payload, agent, subject_scope)


def source_for(prepared):
    run, _, agent_data = prepared
    if agent_data is None:
        return stream_run(run)
    payload, agent, scope = agent_data
    return conversations.stream_run(run, payload, agent, scope, use_memory=scope is not None)


async def api_source(prepared):
    run, _, agent_data = prepared
    async for event in source_for(prepared):
        if agent_data is None or event.startswith(":"):
            yield event
            continue
        lines = event.splitlines()
        event_type = next((line[7:] for line in lines if line.startswith("event: ")), "")
        raw = next((line[6:] for line in lines if line.startswith("data: ")), "{}")
        value = json.loads(raw)
        if event_type == "delta":
            yield (
                "data: "
                + json.dumps(
                    {
                        "id": run.pk,
                        "code": 0,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {
                                    "content": value.get("content", ""),
                                    "reasoning_content": value.get("reasoningContent", ""),
                                },
                                "finish_reason": None,
                            }
                        ],
                    },
                    ensure_ascii=False,
                )
                + "\n\n"
            )
        elif event_type == "end":
            yield (
                "data: "
                + json.dumps(
                    {
                        "id": run.pk,
                        "code": 0 if value["status"] == "completed" else 500,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {},
                                "finish_reason": "stop"
                                if value["status"] == "completed"
                                else "error",
                            }
                        ],
                    }
                )
                + "\n\ndata: [DONE]\n\n"
            )
        else:
            yield event


async def completed_response(prepared):
    async for _ in source_for(prepared):
        pass
    run = prepared[0]
    await sync_to_async(run.refresh_from_db)()
    content = run.answer if isinstance(run, AgentRun) else run.output
    succeeded = run.status == "completed"
    return JsonResponse(
        {
            "id": run.pk,
            "runId": run.pk,
            "sessionId": prepared[1].session_id,
            "code": 0 if succeeded else 500,
            "status": run.status,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": "stop" if succeeded else "error",
                }
            ],
        },
        status=200 if succeeded else 502,
    )


def response_for(prepared, *, api=False, stream=True):
    if not isinstance(stream, bool):
        raise ValidationError("stream必须为布尔值")
    if not stream:
        return async_to_sync(completed_response)(prepared)
    response = StreamingHttpResponse(
        api_source(prepared) if api else source_for(prepared), content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-store"
    response["X-Accel-Buffering"] = "no"
    return response


@api_endpoint(["POST"])
def published_chat(request, bot_id):
    publication, share_id = browser_publication(request, bot_id)
    scope = resolve_scope(request)
    return response_for(
        prepare_public(
            publication,
            scope.uid,
            request.payload,
            caller_space_id=scope.space_id,
            share_id=share_id,
        )
    )


def api_publication(request, resource_kind):
    app = tenant.authenticate(request.headers.get("Authorization", ""))
    values = request.payload
    resource_id = (
        values.get("bot_id", values.get("botId"))
        if resource_kind == "agent"
        else values.get("flow_id", values.get("flowId"))
    )
    if not resource_id:
        raise ValidationError("缺少已发布资源标识")
    if not isinstance(values.get("stream", True), bool):
        raise ValidationError("stream必须为布尔值")
    publication = require_publication(
        bot_id=values.get("bot_id", values.get("botId")) if resource_kind == "agent" else None,
        flow_id=values.get("flow_id", values.get("flowId"))
        if resource_kind == "workflow"
        else None,
        channel="API",
        app_id=app.app_id,
    )
    if publication.candidate.resource_kind != resource_kind:
        raise PermissionDenied
    subject = values.get("user", values.get("uid", "default"))
    return app, publication, external_uid("api", app.app_id, subject)


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
@upstream_errors
def workflow_api(request):
    app, publication, caller = api_publication(request, "workflow")
    return response_for(
        prepare_public(publication, caller, request.payload, kind="api", app_id=app.app_id),
        api=True,
        stream=request.payload.get("stream", True),
    )


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
@upstream_errors
def agent_api(request):
    app, publication, caller = api_publication(request, "agent")
    values = dict(request.payload)
    if "message" not in values:
        messages = values.get("messages", [])
        if (
            not isinstance(messages, list)
            or len(messages) != 1
            or not isinstance(messages[0], dict)
            or messages[0].get("role") != "user"
        ):
            raise ValidationError("请提供一条用户消息；历史由服务端会话维护")
        values["message"] = messages[0].get("content")
    return response_for(
        prepare_public(publication, caller, values, kind="api", app_id=app.app_id),
        api=True,
        stream=values.get("stream", True),
    )


def grant_run(grant):
    check_grant(grant)
    if grant.candidate.resource_kind == "agent":
        return AgentRun.objects.get(pk=grant.run_id)
    return reconcile(WorkflowRun.objects.get(pk=grant.run_id))


def control_grant(grant, action, values):
    run = grant_run(grant)
    if action == "resume":
        if grant.candidate.resource_kind != "workflow":
            raise ValidationError("仅暂停的工作流支持恢复")
        content = text(values, "content", required=True, limit=200000)
        claim_run(run, resume=True)
        response = StreamingHttpResponse(
            stream_run(run, resume_content=content), content_type="text/event-stream"
        )
        response["Cache-Control"] = "no-store"
        response["X-Accel-Buffering"] = "no"
        return response
    if action == "stop":
        cancel_root(grant.root_id)
        run.refresh_from_db()
        return {"id": run.pk, "status": run.status, "cancelRequested": True}
    raise Http404


def api_grant(request):
    app = tenant.authenticate(request.headers.get("Authorization", ""))
    key = request.payload.get("runId", request.payload.get("event_id"))
    if not isinstance(key, str) or not key.strip() or len(key) > 128:
        raise ValidationError("缺少有效的运行标识")
    grant = (
        PublicRunGrant.objects.filter(run_id=key, app_id=app.app_id, identity_kind="api")
        .select_related("candidate")
        .first()
    )
    if grant is None:
        run = WorkflowRun.objects.filter(event_id=key).first()
        grant = (
            PublicRunGrant.objects.filter(run_id=run.pk, app_id=app.app_id, identity_kind="api")
            .select_related("candidate")
            .first()
            if run
            else None
        )
    if grant is None:
        raise Http404
    return grant


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
@upstream_errors
def resume_api(request):
    return control_grant(api_grant(request), "resume", request.payload)


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
@upstream_errors
def stop_api(request):
    """Cancel an API-owned run after re-authenticating the same application."""
    return control_grant(api_grant(request), "stop", request.payload)


@api_endpoint(["POST"])
def published_control(request, run_id, action):
    scope = resolve_scope(request)
    grant = (
        PublicRunGrant.objects.filter(
            run_id=run_id,
            caller_uid=scope.uid,
            caller_space_id=scope.space_id,
            identity_kind="console",
        )
        .select_related("candidate")
        .first()
    )
    if grant is None:
        raise Http404
    return control_grant(grant, action, request.payload)


@api_endpoint(["GET"])
def published_history(request, bot_id):
    from .public_files import file_data

    publication, _ = browser_publication(request, bot_id)
    scope = resolve_scope(request)
    grants = PublicRunGrant.objects.filter(
        publication=publication,
        caller_uid=scope.uid,
        caller_space_id=scope.space_id,
        identity_kind="console",
    )
    session_id = request.GET.get("sessionId")
    if session_id:
        grants = grants.filter(session_id=session_id)
    result = []
    for grant in grants.select_related("candidate").order_by("-create_time")[:100]:
        run = grant_run(grant)
        artifacts = [file_data(row) for row in AgentFile.objects.filter(run_id=run.pk)]
        workflow_ids = WorkflowRun.objects.filter(context_id=grant.root_id).values("id")
        artifacts.extend(
            {
                "id": str(row.pk),
                "name": row.file_name,
                "downloadUrl": f"/console-api/published/workflow-artifacts/{row.pk}",
            }
            for row in Artifact.objects.filter(
                run_id__in=workflow_ids, uid=grant.caller_uid, deleted=False
            )
        )
        result.append(
            {
                "id": run.pk,
                "sessionId": grant.session_id,
                "kind": grant.candidate.resource_kind,
                "question": run.question if isinstance(run, AgentRun) else run.inputs,
                "answer": run.answer if isinstance(run, AgentRun) else run.output,
                "status": run.status,
                "files": artifacts,
                "createdAt": run.create_time,
            }
        )
    return list(reversed(result))


def frozen_channel_publication(publication_id, candidate_id):
    """Resolve the trusted queue's snapshot while checking its channel remains active."""
    publication = Publication.objects.filter(
        pk=publication_id, active=True, channel="WECHAT"
    ).first()
    if publication is None or not candidate_id:
        raise PermissionDenied
    candidate = PublicationCandidate.objects.filter(
        pk=candidate_id, bot_id=publication.bot_id
    ).first()
    if candidate is None:
        raise PermissionDenied
    validate_candidate(candidate)
    publication.candidate = candidate
    return publication


async def execute_channel(
    publication_id, external_subject, text, conversation_key, *, candidate_id
):
    publication = await sync_to_async(frozen_channel_publication)(publication_id, candidate_id)
    caller = external_uid("wechat", publication.target_id, external_subject)
    session_id = hashlib.sha256(
        f"{publication.pk}\0{caller}\0{conversation_key}".encode()
    ).hexdigest()
    values = {"message": text, "sessionId": session_id}
    if publication.candidate.resource_kind == "workflow":
        inputs = public_data(publication)["inputs"]
        if len(inputs) != 1 or inputs[0]["type"] != "string":
            raise ValidationError("微信工作流需要一个文本输入")
        values["inputs"] = {inputs[0]["name"]: text}
    prepared = await sync_to_async(prepare_public)(publication, caller, values, kind="wechat")
    async for _ in source_for(prepared):
        pass
    run = prepared[0]
    await sync_to_async(run.refresh_from_db)()
    if run.status != "completed":
        raise ValidationError("渠道执行未成功完成")
    return run.answer if isinstance(run, AgentRun) else run.output
