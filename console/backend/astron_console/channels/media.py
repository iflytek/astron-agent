"""Scoped media management and authentic remote training jobs."""

import io
import json
import logging
import secrets
import wave
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.agents.models import Agent
from astron_console.http import api_endpoint
from astron_console.resources.common import (
    UpstreamError,
    number,
    parsed,
    scope_for,
    serialize,
    text,
    upstream_errors,
)
from astron_console.spaces.permissions import require_resource_access, scope_queryset
from astron_console.workflows.management_views import create_workflow, get_by_id
from astron_console.workflows.protocol import clean_config, normalize_graph

from .media_client import VoiceTraining, avatar_sign, rtasr_sign, speech_sign
from .models import MediaHistory, Pronunciation, Speaker, VoiceTask, WorkflowMediaConfig

log = logging.getLogger(__name__)
READ = "SpeakerTrainController_trainSpeaker_GET"
WRITE = "SpeakerTrainController_updateTrainSpeaker_POST"
DELETE = "SpeakerTrainController_deleteTrainSpeaker_POST"
CREATE = "SpeakerTrainController_create_POST"
BOT_READ = "MyBotController_getBotDetail_POST"
BOT_WRITE = "BotCreateController_updateBot_POST"


def _speaker(scope, pk=None, asset=None, permission=READ):
    row = Speaker.objects.filter(deleted=0, **({"pk": pk} if pk else {"asset_id": asset})).first()
    if row is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=row.create_uid, space_id=row.space_id, permission_key=permission
    )
    return row


def _scene_list():
    return json.loads((Path(__file__).parent / "scenes.json").read_text())


def _pronunciations(request):
    names = json.loads((Path(__file__).parent / "speaker_names.json").read_text())
    language = "en" if request.headers.get("Accept-Language", "").lower().startswith("en") else "zh"
    rows = []
    for row in Pronunciation.objects.filter(speaker_type="NORMAL", deleted=0).order_by(
        "sort", "id"
    ):
        data = serialize(row)
        data["name"] = names.get(row.name, {}).get(language, row.name)
        rows.append(data)
    return rows


@api_endpoint(["GET"])
def pronunciation(request):
    scope_for(request, READ)
    return _pronunciations(request)


@api_endpoint(["POST"])
def rtasr(request):
    scope_for(request, READ)
    return rtasr_sign()


@api_endpoint(["GET"])
def tts(request):
    scope = scope_for(request, READ)
    code = request.GET.get("code", "")
    if code and not Pronunciation.objects.filter(voice_type=code, deleted=0).exists():
        # Known scene voices are public; user-trained assets always require ownership.
        if code not in {row["defaultVCN"] for row in _scene_list()}:
            _speaker(scope, asset=code)
            return speech_sign(clone=True)
    return speech_sign()


@api_endpoint(["POST"])
def scenes(request):
    scope_for(request, BOT_READ)
    return _scene_list()


@api_endpoint(["POST"])
def vcn_list(request):
    scope_for(request, READ)
    return _pronunciations(request)


@api_endpoint(["GET"])
@upstream_errors
def training_text(request):
    scope_for(request, CREATE)
    result = VoiceTraining().request("task/traintext", {"textId": 5001})
    if not isinstance(result, dict) or not isinstance(result.get("textSegs"), list):
        raise UpstreamError("声音训练文本响应无效")
    return result


def validate_audio(upload):
    if not upload or not upload.size or upload.size > 3 * 1024 * 1024:
        raise ValidationError("音频文件不能为空且不得超过3MB")
    suffix = Path(upload.name).suffix.lower()
    if suffix not in {".wav", ".mp3", ".m4a", ".pcm"}:
        raise ValidationError("音频格式不支持")
    # PCM from the built-in recorder is 24kHz/16-bit mono. Compressed formats are
    # validated by the provider, which owns its decoder and quality requirements.
    if suffix == ".pcm" and (upload.size % 2 or upload.size > 24000 * 2 * 40):
        raise ValidationError("PCM需为24kHz/16位单声道且不超过40秒")
    if suffix == ".wav":
        try:
            with wave.open(io.BytesIO(upload.read()), "rb") as audio:
                if (
                    audio.getnchannels() != 1
                    or audio.getframerate() < 24000
                    or audio.getsampwidth() != 2
                    or audio.getnframes() / audio.getframerate() > 40
                ):
                    raise ValidationError("WAV需为24kHz以上16位单声道且不超过40秒")
        except (wave.Error, EOFError):
            raise ValidationError("WAV音频无效") from None
        finally:
            upload.seek(0)


@api_endpoint(["POST"])
@upstream_errors
def train(request):
    upload = request.FILES.get("file")
    validate_audio(upload)
    scope = scope_for(request, CREATE)
    if len(scope.uid) > 64:
        raise ValidationError("声音训练用户标识超出保留表支持的长度")
    payload = {**request.GET.dict(), **request.payload}
    seg_id = number(payload.get("segId"))
    sex = number(payload.get("sex"), maximum=2)
    language = payload.get("language") or ""
    if language not in {"", "zh", "en", "jp", "ko", "ru"}:
        raise ValidationError("训练语言不支持")
    trainer = VoiceTraining()
    body = {
        "taskName": "Astron voice",
        "sex": sex,
        "ageGroup": 2,
        "resourceType": 12,
        "thirdUser": scope.uid,
    }
    if language not in {"", "zh"}:
        body["language"] = language
    task_id = trainer.request("task/add", body)
    if not isinstance(task_id, str) or not task_id or len(task_id) > 64:
        raise UpstreamError("声音训练任务响应无效")
    task = VoiceTask.objects.create(
        uid=scope.uid, space_id=scope.space_id, task_id=task_id, status="created", object_key=""
    )
    try:
        trainer.request(
            "task/submitWithAudio",
            {"taskId": task_id, "textId": 5001, "textSegId": seg_id},
            file=upload,
        )
    except UpstreamError:
        # Submission may have reached the provider. Never create/re-submit automatically.
        task.status = "unknown"
        task.error = "音频提交结果待核验"
        task.save(update_fields=["status", "error"])
        raise
    task.status = "training"
    task.save(update_fields=["status"])
    log.info("Voice training submitted task=%s uid=%s", task_id, scope.uid)
    return {"taskId": task_id, "status": task.status}


def refresh_training(task):
    if task.status in {"succeeded", "failed"}:
        return task
    result = VoiceTraining().request("task/result", {"taskId": task.task_id})
    if not isinstance(result, dict) or result.get("trainStatus") not in (-1, 0, 1, 2):
        raise UpstreamError("声音训练状态响应无效")
    with transaction.atomic():
        task = VoiceTask.objects.select_for_update().get(pk=task.pk)
        if task.status in {"succeeded", "failed"}:
            return task
        if result["trainStatus"] == 1:
            asset = result.get("assetId")
            if not isinstance(asset, str) or not asset or len(asset) > 64:
                raise UpstreamError("声音训练成功响应缺少音色")
            speaker = Speaker.objects.create(
                create_uid=task.uid,
                space_id=task.space_id,
                name="my_speaker_" + secrets.token_hex(3),
                task_id=task.task_id,
                asset_id=asset,
            )
            task.speaker_id = speaker.pk
            task.status = "succeeded"
            task.error = ""
        elif result["trainStatus"] in (0, 2):
            task.status = "failed"
            task.error = (
                "声音训练失败" if result["trainStatus"] == 0 else "训练任务未提交，请重新录制"
            )
        else:
            task.status = "training"
        task.updated_at = timezone.now()
        task.save()
    return task


@api_endpoint(["GET"])
@upstream_errors
def training_status(request, task_id):
    scope = scope_for(request, READ)
    task = VoiceTask.objects.filter(task_id=task_id).first()
    if not task:
        raise Http404
    require_resource_access(scope, owner_uid=task.uid, space_id=task.space_id, permission_key=READ)
    task = refresh_training(task)
    return {
        "taskId": task.task_id,
        "status": task.status,
        "speakerId": task.speaker_id,
        "error": task.error,
    }


@api_endpoint(["GET"])
def speakers(request):
    scope = scope_for(request, READ)
    query = scope_queryset(Speaker.objects.filter(deleted=0), scope, uid_field="create_uid")
    return [{"id": x.pk, "name": x.name, "assetId": x.asset_id} for x in query]


@api_endpoint(["POST"])
def speaker(request):
    scope = scope_for(request, WRITE)
    payload = {**request.GET.dict(), **request.payload}
    row = _speaker(scope, pk=number(payload.get("id")), permission=WRITE)
    # Existing MySQL installations retain custom_speaker.name VARCHAR(64).
    row.name = text(payload, "name", required=True, limit=64)
    row.update_time = timezone.now()
    row.save(update_fields=["name", "update_time"])
    return None


@api_endpoint(["POST"])
def delete_speaker(request):
    scope = scope_for(request, DELETE)
    row = _speaker(
        scope, pk=number(request.GET.get("id") or request.payload.get("id")), permission=DELETE
    )
    row.deleted = 1
    row.update_time = timezone.now()
    row.save(update_fields=["deleted", "update_time"])
    return None


def bot(scope, bot_id, permission=BOT_READ):
    row = Agent.objects.filter(pk=number(bot_id), version=4, is_delete=0).first()
    if row is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=row.uid, space_id=row.space_id, permission_key=permission
    )
    return row


def media_config(scope, value):
    if not isinstance(value, dict):
        raise ValidationError("虚拟人配置必须为对象")
    result = {}
    for key in ("interactType", "sceneMode", "sceneEnable", "vcnEnable"):
        val = value.get(key, 0)
        if (
            isinstance(val, bool)
            or not isinstance(val, int)
            or not 0 <= val <= (3 if key == "interactType" else 1)
        ):
            raise ValidationError("虚拟人配置选项无效")
        result[key] = val
    for key in ("vcn", "sceneId", "callSceneId", "sceneVcn"):
        result[key] = text(value, key, limit=128)
    public_voices = {row["defaultVCN"] for row in _scene_list()} | set(
        Pronunciation.objects.filter(deleted=0).values_list("voice_type", flat=True)
    )
    for name in ("vcn", "sceneVcn"):
        if result[name] and result[name] not in public_voices:
            _speaker(scope, asset=result[name])
    if (
        result["sceneEnable"]
        and result["sceneMode"] == 0
        and result["sceneId"] not in {r["sceneId"] for r in _scene_list()}
    ):
        raise ValidationError("虚拟人形象无效")
    return result


@api_endpoint(["POST"])
@transaction.atomic
def talk_create(request, upgrade=False):
    from astron_console.publishing.models import WorkflowBot

    scope = scope_for(request, "BotCreateController_createBot_POST")
    data = request.payload
    config = media_config(scope, data.get("talkAgentConfig", {}))
    graph = None
    name = text(data, "name", limit=48)
    description = text(data, "botDesc", limit=255)
    if upgrade:
        source = Agent.objects.filter(pk=number(data.get("sourceId")), is_delete=0).first()
        if source is None:
            raise Http404
        require_resource_access(
            scope, owner_uid=source.uid, space_id=source.space_id, permission_key=BOT_READ
        )
        link = WorkflowBot.objects.filter(bot_id=source.pk).first()
        if link is None:
            raise ValidationError("源应用未关联工作流")
        workflow = get_by_id(scope, link.maas_id)
        graph = normalize_graph(workflow.data)
        name = name or source.bot_name
        description = description or source.bot_desc or ""
    if not name:
        raise ValidationError("应用名称必填")
    row = Agent.objects.create(
        uid=scope.uid,
        space_id=scope.space_id,
        version=4,
        bot_name=name,
        bot_desc=description,
        avatar=text(data, "avatar", limit=1024),
        bot_type=number(data.get("botType") or 1),
    )
    workflow_data = {
        "name": name,
        "description": description,
        "avatarIcon": row.avatar,
        "category": row.bot_type,
        "advancedConfig": {"textToSpeech": {"vcn_cn": config["vcn"]}},
    }
    if graph is not None:
        workflow_data["data"] = graph
    workflow = create_workflow(scope, workflow_data)
    workflow.type = 4
    workflow.save(update_fields=["type"])
    WorkflowBot.objects.create(
        bot_id=row.pk,
        uid=scope.uid,
        space_id=scope.space_id,
        flow_id=workflow.flow_id,
        maas_id=workflow.pk,
        bot_name=name,
        name=name,
    )
    WorkflowMediaConfig.objects.create(
        flow_id=workflow.flow_id, bot_id=row.pk, config=json.dumps(config), version_num="-1"
    )
    row.maas_bot_id = str(workflow.pk)
    row.save(update_fields=["maas_bot_id"])
    return {"botId": row.pk, "maasId": workflow.pk, "flowId": workflow.flow_id}


@api_endpoint(["POST", "GET"])
@transaction.atomic
def talk_update(request):
    permission = BOT_READ if request.method == "GET" else BOT_WRITE
    scope = scope_for(request, permission)
    data = request.GET if request.method == "GET" else request.payload
    row = bot(scope, data.get("botId"), permission)
    config = (
        WorkflowMediaConfig.objects.filter(bot_id=row.pk, version_num="-1", deleted=False)
        .order_by("-id")
        .first()
    )
    if config is None:
        raise Http404
    if request.method == "POST":
        for key, field, limit in (
            ("name", "bot_name", 48),
            ("botDesc", "bot_desc", 255),
            ("avatar", "avatar", 1024),
        ):
            if key in data:
                setattr(row, field, text(data, key, required=key == "name", limit=limit))
        if "botType" in data:
            row.bot_type = number(data["botType"] or 1)
        row.save()
        config.config = json.dumps(media_config(scope, data.get("talkAgentConfig", {})))
        config.updated_time = timezone.now()
        config.save(update_fields=["config", "updated_time"])
    return {
        "botId": row.pk,
        "talkAgentConfig": clean_config(parsed(config.config)),
        "flowId": config.flow_id,
    }


@api_endpoint(["GET"])
def talk_signature(request):
    scope_for(request, BOT_READ)
    return avatar_sign()


@api_endpoint(["POST"])
def save_history(request):
    # External avatar transcripts are untrusted media records, never AgentRun output.
    scope = scope_for(request, BOT_READ)
    data = request.payload
    row = bot(scope, data.get("botId"))
    history = MediaHistory.objects.create(
        uid=scope.uid,
        space_id=scope.space_id,
        bot_id=row.pk,
        session_id=text(data, "sessionId", required=True, limit=128),
        question=text(data, "req", limit=100000),
        answer=text(data, "resp", limit=100000),
        sid=text(data, "sid", limit=128),
    )
    return {"id": history.pk}
