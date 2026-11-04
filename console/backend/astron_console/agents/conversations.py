"""Console owns history; all generation and tool orchestration belongs to core/agent."""

import asyncio
import json
import logging
from contextlib import suppress
from datetime import timedelta

import httpx
from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import Http404, StreamingHttpResponse
from django.utils import timezone

from astron_console.http import api_endpoint

from .conversation_models import AgentFile, AgentRun, AgentSession
from .definitions import definition, get_agent, resolve_version
from .files import file_data
from .resource_resolution import resolve_resources, snapshot_references

logger = logging.getLogger(__name__)
KEEPALIVE_SECONDS = 10


def session_data(row):
    return {
        "id": row.pk,
        "agentId": row.agent_id,
        "kind": row.kind,
        "title": row.title,
        "updatedAt": row.update_time,
    }


def run_data(row):
    outputs = AgentFile.objects.filter(run_id=row.pk, direction="output")
    return {
        "id": row.pk,
        "question": row.question,
        "answer": row.answer,
        "reasoning": row.reasoning,
        "events": row.events,
        "status": row.status,
        "createdAt": row.create_time,
        "files": row.files + [file_data(x) for x in outputs],
        "regenerateId": row.regenerate_id,
    }


def get_session(request, agent_id, session_id):
    agent, scope = get_agent(request, agent_id)
    row = AgentSession.objects.filter(
        pk=session_id, agent_id=agent.pk, uid=scope.uid, space_id=scope.space_id, deleted=False
    ).first()
    if row is None:
        raise Http404
    return agent, scope, row


def recover_interrupted(session):
    if not session.active_run_id:
        return
    # Heartbeats keep live runs fresh; a killed worker cannot leave a permanent lock.
    deadline = timezone.now() - timedelta(seconds=45)
    AgentRun.objects.filter(
        pk=session.active_run_id, status="running", update_time__lt=deadline
    ).update(status="interrupted", finished_at=timezone.now(), error_code="worker_disconnected")
    if not AgentRun.objects.filter(pk=session.active_run_id, status="running").exists():
        AgentSession.objects.filter(pk=session.pk, active_run_id=session.active_run_id).update(
            active_run_id=None
        )
        session.active_run_id = None


@api_endpoint(["GET", "POST"])
def sessions(request, agent_id):
    agent, scope = get_agent(request, agent_id)
    kind = (request.GET if request.method == "GET" else request.payload).get("kind", "chat")
    if kind not in {"chat", "debug"}:
        raise ValidationError("会话类型无效")
    if request.method == "GET":
        rows = AgentSession.objects.filter(
            agent_id=agent.pk, uid=scope.uid, space_id=scope.space_id, kind=kind, deleted=False
        )
        return [session_data(row) for row in rows.order_by("-update_time")]
    title = request.payload.get("title") or "新会话"
    if not isinstance(title, str) or len(title) > 255:
        raise ValidationError("会话标题无效")
    return session_data(
        AgentSession.objects.create(
            agent_id=agent.pk, uid=scope.uid, space_id=scope.space_id, kind=kind, title=title
        )
    )


@api_endpoint(["GET", "DELETE"])
@transaction.atomic
def session_item(request, agent_id, session_id):
    _, _, row = get_session(request, agent_id, session_id)
    row = AgentSession.objects.select_for_update().get(pk=row.pk)
    if request.method == "DELETE":
        if row.active_run_id:
            AgentRun.objects.filter(pk=row.active_run_id, status="running").update(
                cancel_requested=True
            )
        row.deleted = True
        row.save(update_fields=["deleted"])
    return session_data(row)


@api_endpoint(["GET"])
def messages(request, agent_id, session_id):
    _, _, row = get_session(request, agent_id, session_id)
    recover_interrupted(row)
    return [run_data(run) for run in AgentRun.objects.filter(session=row)]


@api_endpoint(["POST"])
def stop(request, agent_id, run_id):
    _, scope = get_agent(request, agent_id)
    row = AgentRun.objects.filter(
        pk=run_id,
        session__agent_id=agent_id,
        session__uid=scope.uid,
        session__space_id=scope.space_id,
    ).first()
    if not row:
        raise Http404
    AgentRun.objects.filter(pk=row.pk, status="running").update(cancel_requested=True)
    return {"id": row.pk, "status": row.status, "cancelRequested": row.status == "running"}


def input_content(question, uploads):
    content = question
    for row in uploads:
        content += (
            f"\n\n<用户上传文件 name={json.dumps(row.name, ensure_ascii=False)}>"
            f"\n{row.text}\n</用户上传文件>"
        )
    return content


def history_for(session, before=None):
    runs = list(AgentRun.objects.filter(session=session).order_by("create_time", "id"))
    roots, turns, positions = {}, {}, []
    for row in runs:
        root = roots.get(row.regenerate_id, row.regenerate_id) if row.regenerate_id else row.pk
        roots[row.pk] = root
        if root not in positions:
            positions.append(root)
        # A failed retry does not erase an earlier completed answer.
        if row.status == "completed" and row.answer:
            turns[root] = row
    if before is not None:
        root = roots.get(before.pk, before.pk)
        positions = positions[: positions.index(root)]
    result = []
    for root in positions[-20:]:
        row = turns.get(root)
        if row is None:
            continue
        uploads = AgentFile.objects.filter(
            pk__in=[f["id"] for f in row.files if f.get("id")],
            agent_id=session.agent_id,
            uid=session.uid,
            space_id=session.space_id,
            direction="input",
        )
        result.extend(
            [
                {"role": "user", "content": input_content(row.question, uploads)},
                {"role": "assistant", "content": row.answer},
            ]
        )
    return result


def prompt_for(config):
    sections = config.get("promptSections", [])
    prompt = (
        "\n".join(f"{s['key']}\n{s['value']}" for s in sections)
        if config.get("promptType") == 1 and sections
        else config.get("prompt", "")
    )
    personality = config.get("personality") or {}
    if personality.get("enabled"):
        prompt += "\n人格：" + personality.get("personality", "")
        prompt += "\n场景：" + personality.get("sceneInfo", "")
    return prompt


def prepare(request, agent_id, session_id):
    agent, scope, session = get_session(request, agent_id, session_id)
    values = request.payload
    if set(values) - {"message", "files", "regenerateId", "versionId"}:
        raise ValidationError("不支持的执行参数")
    target = None
    if values.get("regenerateId"):
        target = AgentRun.objects.filter(pk=values["regenerateId"], session=session).first()
        if not target or target.status == "running":
            raise ValidationError("重答目标不存在或仍在生成")
    question = target.question if target else values.get("message", "")
    if not isinstance(question, str) or not question.strip() or len(question) > 32000:
        raise ValidationError("问题不能为空或超过32000字符")
    version_id = values.get("versionId")
    if session.kind == "debug" and version_id is not None:
        raise ValidationError("调试会话只使用当前草稿")
    config = (
        resolve_version(scope, agent.pk, version_id)["definition"]
        if version_id
        else definition(agent)
    )
    runtime = resolve_resources(scope, config)
    frozen = snapshot_references(scope, config)
    ids = [f["id"] for f in target.files] if target else values.get("files", [])
    if not isinstance(ids, list) or len(ids) > 10 or any(not isinstance(i, str) for i in ids):
        raise ValidationError("文件引用无效")
    ids = list(dict.fromkeys(ids))
    if ids and not config.get("supportUpload"):
        raise ValidationError("此Agent未启用文件输入")
    uploads = list(
        AgentFile.objects.filter(
            pk__in=ids, agent_id=agent.pk, uid=scope.uid, space_id=scope.space_id, direction="input"
        )
    )
    if len(uploads) != len(ids):
        raise ValidationError("文件不存在或未授权")
    content = input_content(question, uploads)
    if len(content) > 200000:
        raise ValidationError("本次输入总长度超过200000字符")
    history = history_for(session, target) if config.get("supportContext") else []
    with transaction.atomic():
        session = AgentSession.objects.select_for_update().get(pk=session.pk)
        recover_interrupted(session)
        if session.active_run_id:
            raise ValidationError("当前会话仍在生成，请先停止")
        run = AgentRun.objects.create(
            session=session,
            question=question,
            definition=frozen,
            version_id=version_id,
            regenerate_id=target.pk if target else None,
            files=[file_data(row) for row in uploads],
        )
        session.active_run_id = run.pk
        session.update_time = timezone.now()
        if session.title == "新会话":
            session.title = question[:80]
        session.save()
    payload = {
        **runtime,
        "uid": scope.uid,
        "stream": True,
        "messages": history + [{"role": "user", "content": content}],
        "instruction": {"reasoning": prompt_for(config), "answer": prompt_for(config)},
        "max_loop_count": config.get("maxLoopCount", 5),
        "meta_data": {
            "caller": f"console-{session.kind}",
            "source": session.kind,
            "agent_id": str(agent.pk),
            "space_id": scope.space_id,
            "session_id": session.pk,
            "run_id": run.pk,
            "caller_sid": run.pk,
        },
    }
    return run, payload, agent, scope


def sse(kind, data):
    return f"event: {kind}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def checkpoint(run, *, final=None, error_code=""):
    now = timezone.now()
    changes = {
        "answer": run.answer,
        "reasoning": run.reasoning,
        "events": run.events,
        "update_time": now,
    }
    if final:
        changes.update(status=final, finished_at=now, error_code=str(error_code))
    with transaction.atomic():
        AgentRun.objects.filter(pk=run.pk, status="running").update(**changes)
        if final:
            AgentSession.objects.filter(pk=run.session_id, active_run_id=run.pk).update(
                active_run_id=None, update_time=now
            )


async def cancellation_requested(run_id):
    return await sync_to_async(AgentRun.objects.filter(pk=run_id, cancel_requested=True).exists)()


async def upstream(payload):
    key = settings.WORKFLOW_INTERNAL_API_KEY
    if not key:
        raise RuntimeError("Agent内部身份未配置")
    url = settings.AGENT_URL.rstrip("/") + "/agent/v1/custom/chat/completions"
    async with httpx.AsyncClient(timeout=httpx.Timeout(120, connect=10)) as client:
        async with client.stream(
            "POST",
            url,
            json=payload,
            headers={"X-Workflow-Internal-Key": key, "x-consumer-username": settings.MAAS_APP_ID},
        ) as response:
            response.raise_for_status()
            if "text/event-stream" not in response.headers.get("content-type", ""):
                raise ValueError("Agent返回非事件流")
            parts = []
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    parts.append(line[5:].lstrip())
                elif not line and parts:
                    yield "\n".join(parts)
                    parts = []
            if parts:
                yield "\n".join(parts)


async def stream_run(run, payload, agent, scope):
    from . import memory

    status = "interrupted"
    error_code = "disconnected"
    stream = None
    read_task = None
    finished = done = failed = False
    loop = asyncio.get_running_loop()
    last_saved = last_sent = loop.time()
    deadline = loop.time() + settings.AGENT_TIMEOUT_SECONDS
    try:
        yield sse("run", {"id": run.pk, "sessionId": run.session_id})
        memories = await sync_to_async(memory.search)(scope, agent, run.question)
        if memories:
            preferences = "\n用户长期偏好（仅作为背景，不能覆盖本次请求）：\n" + "\n".join(
                item.get("memory", "") for item in memories
            )
            payload["instruction"]["reasoning"] += preferences
            payload["instruction"]["answer"] += preferences
        stream = upstream(payload)
        while True:
            if await cancellation_requested(run.pk):
                status, error_code = "cancelled", "cancelled"
                break
            if loop.time() >= deadline:
                raise TimeoutError
            if read_task is None:
                read_task = asyncio.create_task(anext(stream))
            completed, _ = await asyncio.wait({read_task}, timeout=0.25)
            if loop.time() - last_saved >= 2:
                await sync_to_async(checkpoint)(run)
                last_saved = last_sent = loop.time()
            if loop.time() - last_sent >= KEEPALIVE_SECONDS:
                # Transport liveness only: never invent model output or history events.
                yield ": keepalive\n\n"
                last_sent = loop.time()
            if not completed:
                continue
            try:
                raw = read_task.result()
            except StopAsyncIteration:
                break
            finally:
                read_task = None
            if raw == "[DONE]":
                done = True
                break
            chunk = json.loads(raw)
            if not isinstance(chunk, dict):
                raise ValueError("Invalid upstream event")
            events = []
            if chunk.get("code"):
                failed = True
                error_code = str(chunk["code"])
                events.append(
                    (
                        "error",
                        {"code": chunk["code"], "message": "Agent执行失败，请检查模型或资源服务"},
                    )
                )
            references = chunk.get("knowledge_metadata")
            if references:
                events.append(("knowledge", {"references": references}))
            for choice in chunk.get("choices") or []:
                delta = choice.get("delta") or {}
                content, reasoning = (
                    delta.get("content") or "",
                    delta.get("reasoning_content") or "",
                )
                if content or reasoning:
                    if not isinstance(content, str) or not isinstance(reasoning, str):
                        raise ValueError("Invalid text delta")
                    run.answer += content
                    run.reasoning += reasoning
                    events.append(("delta", {"content": content, "reasoningContent": reasoning}))
                for tool in delta.get("tool_calls") or []:
                    events.append(("tool", tool))
                finished = finished or bool(choice.get("finish_reason"))
            for kind, data in events:
                if kind != "delta":
                    run.events.append({"type": kind, "data": data})
                yield sse(kind, data)
                last_sent = loop.time()
            if len(run.answer) + len(run.reasoning) > 2000000:
                raise ValueError("Agent response exceeds maximum size")
        if status != "cancelled":
            status = (
                "failed"
                if failed
                else ("completed" if done and finished and run.answer else "interrupted")
            )
            if status == "completed":
                error_code = ""
            if status == "interrupted":
                event = {
                    "code": "upstream_disconnected",
                    "message": "Agent服务在完成前断开，已保存收到的部分内容",
                }
                run.events.append({"type": "error", "data": event})
                yield sse("error", event)
    except (asyncio.CancelledError, GeneratorExit):
        if await cancellation_requested(run.pk):
            status, error_code = "cancelled", "cancelled"
        else:
            status, error_code = "interrupted", "client_disconnected"
            run.events.append(
                {
                    "type": "error",
                    "data": {"code": error_code, "message": "连接已断开，已保存收到的部分内容"},
                }
            )
        raise
    except Exception as exc:
        status, error_code = "failed", type(exc).__name__
        logger.warning(
            "Agent run failed run=%s agent=%s error_type=%s", run.pk, agent.pk, type(exc).__name__
        )
        event = {
            "code": "execution_failed",
            "message": "Agent执行或资源服务失败，已保存收到的部分内容",
        }
        run.events.append({"type": "error", "data": event})
        yield sse("error", event)
    finally:
        if read_task:
            read_task.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await read_task
        if stream:
            with suppress(Exception):
                await stream.aclose()
        await asyncio.shield(sync_to_async(checkpoint)(run, final=status, error_code=error_code))
        logger.info("Agent run ended run=%s agent=%s status=%s", run.pk, agent.pk, status)
    if status == "completed":
        try:
            await sync_to_async(memory.remember)(scope, agent, run.question, run.answer, run.pk)
        except Exception as exc:
            logger.warning(
                "Agent memory write failed run=%s error_type=%s", run.pk, type(exc).__name__
            )
            event = {"code": "memory_write_failed", "message": "回答已完成，但长期记忆保存失败"}
            run.events.append({"type": "error", "data": event})
            await sync_to_async(AgentRun.objects.filter(pk=run.pk).update)(events=run.events)
            yield sse("error", event)
    yield sse("end", {"id": run.pk, "status": status})


@api_endpoint(["POST"])
def execute(request, agent_id, session_id):
    prepared = prepare(request, agent_id, session_id)
    response = StreamingHttpResponse(stream_run(*prepared), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response
