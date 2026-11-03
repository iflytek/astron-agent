import json
import logging
from urllib.parse import quote

from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint

from . import clients
from .common import (
    listing,
    number,
    owned,
    page,
    parsed,
    scope_for,
    serialize,
    text,
    upstream_errors,
)
from .models import (
    CustomCategory,
    CustomCategoryRelation,
    Model,
    ModelCategory,
    ModelCategoryRelation,
    OfficialModel,
    WorkflowScope,
)

logger = logging.getLogger(__name__)
WRITE = "ModelController_validateModel_POST"
READ = "ModelController_list_POST"


def model_data(row):
    data = serialize(row, exclude=("api_key",))
    data.update(
        apiKey="********" if row.api_key else "",
        apiKeyMasked=bool(row.api_key),
        icon=row.image_url or "",
        llmSource=0,
        modelId=row.id,
        enabled=bool(row.enable),
        tag=parsed(row.tag, []),
        categoryTree=category_tree(row.id),
        userName=row.uid,
    )
    return data


def official_data(row):
    data = serialize(row)
    data.update(
        llmSource=1,
        modelId=row.id,
        enabled=row.shelf_status == 0,
        apiKey="",
        icon="",
        tag=[],
        categoryTree=category_tree(row.id),
        status=1,
    )
    return data


def category_tree(model_id=None):
    query = ModelCategory.objects.filter(is_delete=0).order_by("sort_order", "id")
    selected = (
        set(
            ModelCategoryRelation.objects.filter(model_id=model_id).values_list(
                "category_id", flat=True
            )
        )
        if model_id
        else None
    )
    rows = list(query)
    if selected is not None:
        parents = {r.id: r.pid for r in rows}
        for pk in list(selected):
            seen = set()
            while pk in parents and pk not in seen:
                seen.add(pk)
                pk = parents[pk]
                selected.add(pk)
        rows = [r for r in rows if r.id in selected]
    nodes = {
        r.id: {
            "id": r.id,
            "key": r.key,
            "name": r.name,
            "sortOrder": r.sort_order,
            "source": "SYSTEM",
            "children": [],
        }
        for r in rows
    }
    roots = []
    for row in rows:
        (nodes[row.pid]["children"] if row.pid in nodes else roots).append(nodes[row.id])
    if model_id:
        customs = CustomCategory.objects.filter(
            id__in=CustomCategoryRelation.objects.filter(model_id=model_id).values("custom_id"),
            is_delete=0,
        )
        for row in customs:
            node = {
                "id": row.id,
                "key": row.key,
                "name": row.name,
                "source": "USER",
                "children": [],
            }
            (nodes[row.pid]["children"] if row.pid in nodes else roots).append(node)
    return roots


def bind_categories(model, payload):
    if "modelCategoryReq" not in payload:
        return
    config = payload["modelCategoryReq"]
    if not isinstance(config, dict):
        raise ValidationError("分类格式无效")
    ids = []
    for key in ("categorySystemIds", "sceneSystemIds"):
        items = config.get(key, []) or []
        if not isinstance(items, list):
            raise ValidationError("分类格式无效")
        ids.extend(number(item) for item in items)
    for key in ("languageSystemId", "contextLengthSystemId"):
        if config.get(key):
            ids.append(number(config[key]))
    if ModelCategory.objects.filter(pk__in=set(ids), is_delete=0).count() != len(set(ids)):
        raise ValidationError("分类不存在")
    ModelCategoryRelation.objects.filter(model_id=model.id).delete()
    ModelCategoryRelation.objects.bulk_create(
        [ModelCategoryRelation(model_id=model.id, category_id=pk) for pk in set(ids)]
    )
    CustomCategoryRelation.objects.filter(model_id=model.id).delete()
    for key, category in [("categoryCustom", "modelCategory"), ("sceneCustom", "modelScenario")]:
        item = config.get(key)
        if not item:
            continue
        name = text(item, "customName", required=True, limit=255)
        custom = CustomCategory.objects.filter(
            owner_uid=model.uid, key=category, name=name, is_delete=0
        ).first()
        if custom is None:
            custom = CustomCategory.objects.create(
                owner_uid=model.uid, key=category, name=name, pid=item.get("pid")
            )
        CustomCategoryRelation.objects.create(model_id=model.id, custom_id=custom.id)


@api_endpoint(["GET"])
def categories(request):
    scope_for(request, READ)
    return category_tree()


@api_endpoint(["POST"])
@upstream_errors
def model_list(request):
    scope = scope_for(request, READ)
    payload = request.payload
    if payload.get("type") == 1:
        query = OfficialModel.objects.filter(is_delete=0)
        if payload.get("name"):
            query = query.filter(name__icontains=text(payload, "name"))
        return page(query.order_by("-id"), payload, official_data)
    query = listing(Model.objects.filter(is_deleted=False), scope, payload)

    def refreshed(row):
        if row.type == 2 and row.remark:
            current = clients.call(
                "RESOURCE_LOCAL_MODEL_URL", "GET", "/api/v1/modserv/" + quote(row.remark, safe="")
            )
            if not isinstance(current, dict):
                raise ValidationError("模型部署状态响应无效")
            states = {
                "running": 1,
                "pending": 2,
                "failed": 3,
                "initializing": 4,
                "notExist": 5,
                "notExsit": 5,
                "terminating": 6,
            }
            row.status = states.get(current.get("status"), row.status)
            if current.get("endpoint"):
                row.url = current["endpoint"]
            row.save(update_fields=["status", "url"])
        return model_data(row)

    return page(query, payload, refreshed)


@api_endpoint(["GET"])
def detail(request):
    if request.GET.get("llmSource") == "1":
        scope_for(request, READ)
        row = OfficialModel.objects.filter(
            id=number(request.GET.get("modelId")), is_delete=0
        ).first()
        if not row:
            raise Http404
        return official_data(row)
    row, _ = owned(request, Model, request.GET.get("modelId"), READ)
    return model_data(row)


def populate(row, payload):
    row.name = text(payload, "modelName", required=True, limit=255)
    row.domain = text(payload, "domain", required=True, limit=100)
    row.desc = text(payload, "description", limit=1024)
    row.image_url = text(payload, "icon", limit=255)
    row.color = text(payload, "color", limit=100)
    row.tag = json.dumps(payload.get("tag", []), ensure_ascii=False)
    row.config = json.dumps(payload.get("config", []), ensure_ascii=False)
    for field, key in [("is_think", "isThink"), ("multi_mode", "multiMode")]:
        value = payload.get(key, False)
        if not isinstance(value, bool):
            raise ValidationError(f"{key}必须是布尔值")
        setattr(row, field, value)
    row.update_time = timezone.now()
    row.full_clean(exclude=["api_key", "remark"], validate_unique=False)


@api_endpoint(["POST"])
@upstream_errors
def save_model(request):
    payload = request.payload
    if payload.get("id"):
        row, scope = owned(request, Model, payload["id"], WRITE)
    else:
        scope = scope_for(request, WRITE)
        row = Model(uid=scope.uid, space_id=scope.space_id, type=1, enable=True, status=1)
    populate(row, payload)
    provider = clients.normalize_provider(payload.get("provider"))
    api_key = (
        row.api_key
        if row.pk and payload.get("apiKeyMasked") is False
        else text(payload, "apiKey", required=True)
    )
    row.url = clients.probe_model(
        provider, text(payload, "endpoint", required=True), api_key, row.domain
    )
    row.api_key = api_key
    row.provider = provider
    with transaction.atomic():
        row.save()
        bind_categories(row, payload)
    logger.info("Saved model id=%s uid=%s space=%s", row.pk, scope.uid, scope.space_id)
    return model_data(row)


def _java_llm_id(pk):
    # Preserve the identifier already persisted by java.util.Random(seed).nextLong().
    state = (pk ^ 0x5DEECE66D) & ((1 << 48) - 1)
    values = []
    for _ in range(2):
        state = (state * 0x5DEECE66D + 0xB) & ((1 << 48) - 1)
        value = state >> 16
        values.append(value if value < (1 << 31) else value - (1 << 32))
    value = (values[0] << 32) + values[1]
    return 100000000 + abs(value) % 900000000


def ensure_unreferenced(row):
    tables = connection.introspection.table_names()
    if "workflow" in tables:
        refs = {row.id, _java_llm_id(row.id), (row.id + 123456) ^ 654321}
        for item in WorkflowScope.objects.filter(deleted=False):
            data = parsed(item.data)

            def references(value):
                if isinstance(value, dict):
                    for key, v in value.items():
                        if key in {"modelId", "llmId"} and str(v) in {str(r) for r in refs}:
                            return True
                        if references(v):
                            return True
                if isinstance(value, list):
                    return any(references(v) for v in value)
                return False

            if references(data):
                raise ValidationError("模型仍被工作流引用，无法删除")
    if "bot_model_bind" in tables:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM bot_model_bind WHERE domain = %s LIMIT 1", [row.domain])
            if cursor.fetchone():
                raise ValidationError("模型仍被 Agent 引用，无法删除")
    if "bot_model_config" in tables:
        with connection.cursor() as cursor:
            cursor.execute("SELECT model_config FROM bot_model_config")
            configs = cursor.fetchall()

        def contains_domain(value):
            if isinstance(value, dict):
                return value.get("domain") == row.domain or any(
                    contains_domain(v) for v in value.values()
                )
            if isinstance(value, list):
                return any(contains_domain(v) for v in value)
            return False

        if any(contains_domain(parsed(config[0])) for config in configs):
            raise ValidationError("模型仍被 Agent 引用，无法删除")


@api_endpoint(["DELETE"])
@upstream_errors
def delete(request):
    row, _ = owned(request, Model, request.GET.get("modelId"), "ModelController_validateModel_GET")
    ensure_unreferenced(row)
    if row.type == 2 and row.remark:
        clients.call(
            "RESOURCE_LOCAL_MODEL_URL", "DELETE", "/api/v1/modserv/" + quote(row.remark, safe="")
        )
    row.is_deleted = True
    row.update_time = timezone.now()
    row.save(update_fields=["is_deleted", "update_time"])
    return True


@api_endpoint(["PUT"])
def toggle(request, option):
    if option not in {"enable", "disable"}:
        raise ValidationError("未知模型操作")
    row, _ = owned(request, Model, request.GET.get("modelId"), "ModelController_switchModel_GET")
    row.enable = option == "enable"
    row.update_time = timezone.now()
    row.save(update_fields=["enable", "update_time"])
    return True


@api_endpoint(["GET"])
@upstream_errors
def local_files(request):
    scope_for(request, "ModelController_localModelList_GET")
    return clients.call("RESOURCE_LOCAL_MODEL_URL", "GET", "/api/v1/modserv/list")


@api_endpoint(["POST"])
@upstream_errors
def local_model(request):
    payload = request.payload
    if payload.get("id"):
        row, scope = owned(request, Model, payload["id"], "ModelController_localModel_POST")
    else:
        scope = scope_for(request, "ModelController_localModel_POST")
        row = Model(uid=scope.uid, space_id=scope.space_id, type=2, enable=True, status=2)
    populate(row, payload)
    row.model_path = text(payload, "modelPath", required=True, limit=100)
    row.accelerator_count = number(payload.get("acceleratorCount"), 1, 128)
    row.replica_count = number(payload.get("replicaCount"), 1, 128)
    deploy = {
        "modelName": row.model_path,
        "resourceRequirements": {"acceleratorCount": row.accelerator_count},
        "replicaCount": row.replica_count,
    }
    target = (
        "/api/v1/modserv/" + quote(row.remark, safe="") if row.remark else "/api/v1/modserv/deploy"
    )
    result = clients.call(
        "RESOURCE_LOCAL_MODEL_URL", "PUT" if row.remark else "POST", target, payload=deploy
    )
    if not isinstance(result, dict) or not result.get("serviceId"):
        raise ValidationError("部署服务未返回 serviceId")
    row.remark = result["serviceId"]
    row.status = 2
    row.provider = "openai"
    with transaction.atomic():
        row.save()
        bind_categories(row, payload)
    return model_data(row)
