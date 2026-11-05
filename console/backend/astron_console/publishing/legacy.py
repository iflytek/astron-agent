"""Adopt authoritative historical release snapshots; never substitute a mutable draft."""

import json
import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404

from astron_console.agents.models import Agent, AgentState, AgentVersion, Personality
from astron_console.workflows.models import Workflow, WorkflowVersion
from astron_console.workflows.protocol import clean_config, normalize_graph
from astron_console.workflows.validation import WorkflowValidationUnavailable

from .models import (
    App,
    BotAPI,
    LegacyMarket,
    LegacyPublicationIssue,
    Publication,
    PublicationCandidate,
    WorkflowBot,
)
from .services import validate_candidate, validate_candidate_engine

logger = logging.getLogger(__name__)


def recorded_definition(bot, market, channel):
    """Only versioned content is authoritative. Metadata never grants resource access."""
    if bot.version == 1:
        # The global AgentState pointer also serves INTERNAL releases. It is not proof
        # of either historical external channel, and MARKET cannot prove an API release.
        if channel != "MARKET" or market is None:
            raise ValidationError("旧助手API缺少独立完整发布快照，原绑定与凭据已保留")
        if market is None or market.opened_tool or market.support_document:
            raise ValidationError("旧助手工具或知识配置缺少完整发布存档，需核验后重新发布")
        model_id = market.model_id
        if not model_id and market.model:
            from astron_console.agents.resource_resolution import scoped
            from astron_console.resources.models import Model
            from astron_console.workflows.authorization import active_scope

            scope = active_scope(market.uid or bot.uid, bot.space_id)
            matches = list(
                scoped(
                    Model.objects.filter(is_deleted=False, domain=market.model),
                    scope,
                    "ModelController_list_POST",
                )[:2]
            )
            if len(matches) == 1:
                model_id = matches[0].pk
        if not model_id:
            raise ValidationError("旧发布模型不能唯一映射到已有授权模型，原配置已保留")
        personality = Personality.objects.filter(bot_id=bot.pk, config_type=1, deleted=0).first()
        config = {
            "id": bot.pk,
            "botName": market.bot_name or "",
            "botDesc": market.bot_desc or "",
            "avatar": market.avatar or "",
            "botType": market.bot_type,
            "prompt": market.prompt or "",
            "promptType": 0,
            "promptSections": [],
            "prologue": market.prologue or "",
            "inputExample": "",
            "modelId": model_id,
            "model": market.model or "",
            "supportContext": bool(market.support_context),
            "supportUpload": False,
            "tools": [],
            "skills": [],
            "mcpServerIds": [],
            "mcpServerUrls": [],
            "repoIds": [],
            "legacyDatasetIds": [],
            "workflows": [],
            "maxLoopCount": 5,
            "personality": {
                "enabled": bool(personality.enabled),
                "personality": personality.personality or "",
                "sceneType": personality.scene_type,
                "sceneInfo": personality.scene_info or "",
            }
            if personality
            else {"enabled": False, "personality": "", "sceneInfo": ""},
        }
        version = AgentVersion.objects.create(
            agent_id=bot.pk, definition=config, created_by=market.uid or bot.uid
        )
        return "agent", str(bot.pk), version.pk, version.definition
    binding = WorkflowBot.objects.filter(bot_id=bot.pk).order_by("id").first()
    if binding is None:
        raise ValidationError("旧工作流发布缺少助手绑定")
    versions = (
        WorkflowVersion.objects.filter(flow_id=binding.flow_id, is_deleted=0)
        .exclude(deleted=2)
        .order_by("-id")
    )
    # A saved draft version is not evidence of publication. Only an explicit successful
    # release result, or an exact published_data match, identifies a retained release.
    channel_code = {"MARKET": 1, "API": 2}[channel]
    successful = versions.filter(publish_result__in=["SUCCESS", "success", "成功"])
    version = successful.filter(publish_channel=channel_code).first()
    if version is None:
        version = next(
            (
                row
                for row in successful
                if channel in {x.strip() for x in (row.publish_channels or "").split(",")}
            ),
            None,
        )
    if (
        version is None
        and channel == "MARKET"
        and not versions.filter(publish_channel__isnull=False).exists()
    ):
        workflow = Workflow.objects.filter(flow_id=binding.flow_id, deleted=False).first()
        if workflow and workflow.published_data:
            published = normalize_graph(workflow.published_data)
            version = next(
                (
                    item
                    for item in versions
                    if item.data and normalize_graph(item.data) == published
                ),
                None,
            )
    if version is None:
        raise ValidationError("旧工作流发布缺少可确认的版本快照，需重新发布")
    graph = normalize_graph(version.data)
    config = {
        "graph": graph,
        "advancedConfig": clean_config(json.loads(version.advanced_config or "{}")),
        "botName": (market.bot_name if market else bot.bot_name) or "",
        "botDesc": (market.bot_desc if market else bot.bot_desc) or "",
        "avatar": (market.avatar if market else bot.avatar) or "",
        "prologue": (market.prologue if market else bot.prologue) or "",
        "botType": (market.bot_type if market else bot.bot_type),
    }
    from astron_console.channels.models import WorkflowMediaConfig
    from astron_console.channels.workflow_media import read_version, record

    workflow = Workflow.objects.filter(flow_id=binding.flow_id, deleted=False).first()
    if workflow is None:
        raise ValidationError("旧发布对应工作流不存在或已删除")
    media = record(binding.flow_id, version.version_num)
    # TALK=4 is the retained Java BotVersionEnum; workflow.type=4 is its canvas type.
    # Any retained media row is also evidence that silently omitting media is unsafe.
    media_required = (
        bot.version == 4
        or workflow.type == 4
        or WorkflowMediaConfig.objects.filter(flow_id=binding.flow_id).exists()
    )
    if media is None:
        if media_required:
            raise ValidationError("旧发布版本缺少完整媒体配置存档，不能使用当前草稿替代")
    else:
        try:
            archived_media = json.loads(media.config)
        except (ValueError, TypeError) as exc:
            raise ValidationError("旧发布版本媒体配置存档无效，原记录已保留") from exc
        if not isinstance(archived_media, dict):
            raise ValidationError("旧发布版本媒体配置存档无效，原记录已保留")
        config["talkAgentConfig"] = read_version(binding.flow_id, version.version_num)
    return "workflow", str(binding.flow_id), version.pk, config


def adopt_one(
    source, bot_id, channel, target_id="", publisher=None, market=None, validation_state=None
):
    candidate = _prepare_adoption(source, bot_id, channel, target_id, publisher, market)
    if candidate is None:
        return "existing"
    if (
        candidate.resource_kind == "workflow"
        and validation_state
        and validation_state["unavailable"]
    ):
        raise WorkflowValidationUnavailable(
            "本批次工作流校验服务不可用，尚未核验；服务恢复后请重跑接管"
        )
    validate_candidate_engine(candidate, validation_timeout=10)
    return _finish_adoption(source, candidate, channel, target_id)


@transaction.atomic
def _prepare_adoption(source, bot_id, channel, target_id, publisher, market):
    if Publication.objects.filter(bot_id=bot_id, channel=channel, target_id=target_id).exists():
        LegacyPublicationIssue.objects.filter(source=source).update(resolved=True)
        return None
    bot = Agent.objects.select_for_update().filter(pk=bot_id, is_delete=0).first()
    if bot is None:
        raise ValidationError("旧发布对应助手不存在或已删除")
    kind, resource_id, version_id, definition = recorded_definition(bot, market, channel)
    candidate = PublicationCandidate.objects.create(
        bot_id=bot_id,
        resource_kind=kind,
        resource_id=resource_id,
        version_id=version_id,
        definition=definition,
        owner_uid=publisher or bot.uid,
        space_id=bot.space_id,
        created_by=publisher or bot.uid,
    )
    validate_candidate(candidate)
    return candidate


@transaction.atomic
def _finish_adoption(source, candidate, channel, target_id):
    bot_id = candidate.bot_id
    Agent.objects.select_for_update().get(pk=bot_id)
    if Publication.objects.filter(bot_id=bot_id, channel=channel, target_id=target_id).exists():
        LegacyPublicationIssue.objects.filter(source=source).update(resolved=True)
        return "existing"
    validate_candidate(candidate)
    if (
        channel == "API"
        and not App.objects.filter(app_id=target_id, uid=candidate.created_by, is_delete=0).exists()
    ):
        raise ValidationError("旧API绑定的应用不存在或不可用")
    if candidate.resource_kind == "agent":
        state, _ = AgentState.objects.get_or_create(agent_id=bot_id)
        if state.published_version_id is None:
            state.published_version_id = candidate.version_id
            state.save(update_fields=["published_version_id"])
    Publication.objects.create(
        bot_id=bot_id, channel=channel, target_id=target_id, candidate=candidate
    )
    LegacyPublicationIssue.objects.filter(source=source).update(resolved=True)
    logger.info(
        "Legacy publication adopted bot_id=%s channel=%s candidate_id=%s",
        bot_id,
        channel,
        candidate.pk,
    )
    return "imported"


def adopt_legacy():
    counts = {"imported": 0, "existing": 0, "unresolved": 0}
    jobs = [
        (f"market:{row.pk}", row.bot_id, "MARKET", "", row.uid, row)
        for row in LegacyMarket.objects.filter(is_delete=0, bot_status=1)
    ]
    jobs += [
        (f"api:{row.pk}", row.bot_id, "API", row.app_id, row.uid, None)
        for row in BotAPI.objects.all()
    ]
    validation_state = {"unavailable": False}
    for source, bot_id, channel, target_id, publisher, market in jobs:
        try:
            if (
                channel == "API"
                and not App.objects.filter(app_id=target_id, uid=publisher, is_delete=0).exists()
            ):
                raise ValidationError("旧API绑定的应用不存在或不可用")
            result = adopt_one(
                source, bot_id, channel, target_id, publisher, market, validation_state
            )
            counts[result] += 1
        except (PermissionDenied, Http404, ValidationError, ValueError, KeyError, TypeError) as exc:
            if isinstance(exc, WorkflowValidationUnavailable):
                validation_state["unavailable"] = True
            reason = (
                "；".join(exc.messages)
                if isinstance(exc, ValidationError)
                else "旧发布快照或授权无效，需核验后重新发布"
            )
            LegacyPublicationIssue.objects.update_or_create(
                source=source,
                defaults={"bot_id": bot_id, "reason": reason[:255], "resolved": False},
            )
            counts["unresolved"] += 1
            logger.warning(
                "Legacy publication needs review bot_id=%s channel=%s error_type=%s",
                bot_id,
                channel,
                type(exc).__name__,
            )
    from astron_console.channels.legacy import adopt_legacy_wechat

    channel_counts = adopt_legacy_wechat()
    for key in counts:
        counts[key] += channel_counts[key]
    return counts
