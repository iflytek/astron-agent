"""Read retained history into the new run model without rewriting legacy business rows."""

import hashlib
import json
from collections import defaultdict
from datetime import datetime

from django.db import migrations
from django.utils import timezone
from django.utils.dateparse import parse_datetime

EPOCH = datetime(1970, 1, 1)


def rows(connection, table):
    if table not in connection.introspection.table_names():
        return []
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT * FROM {connection.ops.quote_name(table)}")
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]


def stamp(value, fallback=EPOCH):
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        parsed = parse_datetime(value)
    else:
        parsed = None
    if parsed is None:
        return fallback
    # Console historical timestamps use the configured local timezone without tzinfo.
    return timezone.make_naive(parsed) if timezone.is_aware(parsed) else parsed


def identity(kind, row):
    key = json.dumps([str(row.get("id", "")), str(row.get("create_time", ""))])
    return f"legacy-{kind}-{hashlib.sha256(key.encode()).hexdigest()[:40]}"


def text(value):
    return value if isinstance(value, str) else ""


def owned(row, uid):
    return row.get("uid") in (None, "", uid)


def flagged(value):
    if isinstance(value, bytes):
        return bool(int.from_bytes(value, "big"))
    return str(value) == "1"


def group(source, key):
    result = defaultdict(list)
    for row in source:
        result[row.get(key)].append(row)
    return result


def ordered(source):
    return sorted(source, key=lambda r: (stamp(r.get("create_time")), str(r.get("id", ""))))


def file_display(row, prefix="chat"):
    return {
        "id": f"legacy-file-{prefix}-{row.get('id', row.get('fileId', 'unknown'))}",
        "name": text(row.get("file_name", row.get("fileName"))) or "历史文件",
        "size": row.get("file_size", row.get("fileSize")) or 0,
        "legacy": True,
        "available": False,
        "deleted": flagged(row.get("deleted")),
    }


def save_run(
    Run,
    db,
    session,
    run_id,
    question,
    answer,
    reasoning,
    created,
    updated,
    source,
    *,
    files=None,
    regenerate_id=None,
    cancelled=False,
    events=None,
):
    # Old Java persisted partial/error responses as answer_type=2 and debug stop set sid.
    # Neither is a completion proof, so imported results never claim successful execution.
    status = "cancelled" if cancelled else "interrupted"
    legacy_event = {"type": "legacy", "data": {"source": source, "statusKnown": cancelled}}
    Run.objects.using(db).get_or_create(
        pk=run_id,
        defaults={
            "session_id": session.pk,
            "question": question,
            "answer": answer,
            "reasoning": reasoning,
            "files": files or [],
            "definition": {},
            "events": [legacy_event, *(events or [])],
            "regenerate_id": regenerate_id,
            "status": status,
            "error_code": "legacy_cancelled" if cancelled else "legacy_status_unknown",
            "create_time": created,
            "update_time": updated,
            "finished_at": None,
        },
    )


def import_chat(apps, connection, agents):
    db = connection.alias
    Session = apps.get_model("agents", "AgentSession")
    Run = apps.get_model("agents", "AgentRun")
    requests = group(rows(connection, "chat_req_records"), "chat_id")
    responses = group(rows(connection, "chat_resp_records"), "req_id")
    reasons = group(rows(connection, "chat_reason_records"), "req_id")
    retries = group(rows(connection, "chat_reanwser_records"), "req_id")
    file_refs = group(rows(connection, "chat_file_req"), "req_id")
    files = group(rows(connection, "chat_file_user"), "file_id")
    for chat in rows(connection, "chat_list"):
        agent = agents.get(chat.get("bot_id"))
        uid = chat.get("uid")
        if agent is None or not uid:
            continue
        created = stamp(chat.get("create_time"))
        session, _ = Session.objects.using(db).get_or_create(
            pk=identity("chat", chat),
            defaults={
                "agent_id": agent.pk,
                "uid": uid,
                "space_id": agent.space_id,
                "kind": "chat",
                "title": text(chat.get("title")) or "历史聊天",
                "deleted": flagged(chat.get("is_delete")),
                "create_time": created,
                "update_time": stamp(chat.get("update_time"), created),
            },
        )
        for req in ordered(requests.get(chat["id"], [])):
            if not owned(req, uid):
                continue
            req_created = stamp(req.get("create_time"), created)
            attachments = []
            for ref in file_refs.get(req["id"], []):
                if ref.get("chat_id") != chat["id"] or not owned(ref, uid):
                    continue
                matching = [f for f in files.get(ref.get("file_id"), []) if owned(f, uid)]
                if matching:
                    attachments.extend(file_display(f) for f in matching)
                else:
                    attachments.append(file_display(ref))
            previous = None
            for attempt in ordered(retries.get(req["id"], [])):
                if not owned(attempt, uid) or attempt.get("chat_id") != chat["id"]:
                    continue
                run_id = identity("reanswer", attempt)
                when = stamp(
                    attempt.get("ask_time"), stamp(attempt.get("create_time"), req_created)
                )
                save_run(
                    Run,
                    db,
                    session,
                    run_id,
                    text(attempt.get("ask")) or text(req.get("message")),
                    text(attempt.get("answer")),
                    "",
                    when,
                    stamp(attempt.get("answer_time"), when),
                    "chat_reanwser_records",
                    files=attachments,
                    regenerate_id=previous,
                    cancelled=attempt.get("answer_type") == 3,
                )
                previous = run_id
            matching = [
                r
                for r in responses.get(req["id"], [])
                if owned(r, uid) and r.get("chat_id") == chat["id"]
            ]
            thinking = "\n".join(
                text(r.get("content"))
                for r in ordered(reasons.get(req["id"], []))
                if owned(r, uid) and r.get("chat_id") == chat["id"]
            )
            # Multiple retained response rows are separate attempts, never overwrite one another.
            for resp in ordered(matching) or [None]:
                when = stamp(resp.get("create_time"), req_created) if resp else req_created
                run_id = identity("response", resp) if resp else identity("request", req)
                save_run(
                    Run,
                    db,
                    session,
                    run_id,
                    text(req.get("message")),
                    text(resp.get("message")) if resp else "",
                    thinking,
                    when,
                    stamp(resp.get("update_time"), when) if resp else when,
                    "chat_resp_records" if resp else "chat_req_records",
                    files=attachments,
                    regenerate_id=previous,
                    cancelled=bool(resp and resp.get("answer_type") == 3),
                )
                previous = run_id


def import_debug(apps, connection, agents):
    db = connection.alias
    Session = apps.get_model("agents", "AgentSession")
    Run = apps.get_model("agents", "AgentRun")
    messages = group(rows(connection, "agent_debug_message"), "session_id")
    for old in rows(connection, "agent_debug_session"):
        agent = agents.get(old.get("bot_id"))
        uid = old.get("uid")
        if agent is None or not uid:
            continue
        created = stamp(old.get("create_time"))
        session, _ = Session.objects.using(db).get_or_create(
            pk=identity("debug", old),
            defaults={
                "agent_id": agent.pk,
                "uid": uid,
                "space_id": old.get("space_id"),
                "kind": "debug",
                "title": text(old.get("title")) or "历史调试",
                "deleted": flagged(old.get("is_delete")),
                "create_time": created,
                "update_time": stamp(old.get("update_time"), created),
            },
        )
        pending = None

        def flush(user, assistant=None, *, created=created, session=session):
            row, value = user or assistant
            response = assistant[1] if assistant else {}
            when = stamp(value.get("updateTime"), stamp(row.get("create_time"), created))
            attachments = value.get("chatFileList") or []
            attachments = (
                [file_display(f, "debug") for f in attachments if isinstance(f, dict)]
                if isinstance(attachments, list)
                else []
            )
            tools = response.get("tools") or []
            events = (
                [
                    {"type": "tool", "data": {"name": name, "status": "unknown"}}
                    for name in tools
                    if isinstance(name, str)
                ]
                if isinstance(tools, list)
                else []
            )
            save_run(
                Run,
                db,
                session,
                identity("debug-turn", row),
                text(value.get("message")) if user else "",
                text(response.get("message")),
                text(response.get("reasoning")),
                when,
                stamp(response.get("updateTime"), when),
                "agent_debug_message",
                files=attachments,
                events=events,
            )

        for row in sorted(
            messages.get(old["id"], []),
            key=lambda x: (x.get("message_index") or 0, str(x.get("id"))),
        ):
            try:
                value = json.loads(row.get("message_json") or "{}")
            except (ValueError, TypeError):
                value = {}
            if not isinstance(value, dict):
                value = {}
            kind = str(value.get("reqType", "")).upper()
            if kind == "USER":
                if pending:
                    flush(pending)
                pending = (row, value)
            elif kind == "BOT":
                flush(pending, (row, value))
                pending = None
            else:
                # Preserve malformed/unknown rows in their original table, with an explicit marker.
                save_run(
                    Run,
                    db,
                    session,
                    identity("debug-unknown", row),
                    "",
                    "",
                    "",
                    stamp(row.get("create_time"), created),
                    stamp(row.get("update_time"), created),
                    "agent_debug_message_unreadable",
                )
        if pending:
            flush(pending)


def import_history(apps, schema_editor):
    connection = schema_editor.connection
    Agent = apps.get_model("agents", "Agent")
    # The original product discriminator keeps workflow/talk history outside this migration.
    agents = {a.pk: a for a in Agent.objects.using(connection.alias).filter(version=1)}
    import_chat(apps, connection, agents)
    import_debug(apps, connection, agents)


class Migration(migrations.Migration):
    dependencies = [("agents", "0002_conversations")]
    operations = [migrations.RunPython(import_history, migrations.RunPython.noop)]
