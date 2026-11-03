"""Knowledge repositories, documents and chunks; RAG execution remains in core/knowledge."""

import json
import logging
import uuid
from urllib.parse import urlsplit

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import connection, transaction
from django.db.models import Q, Sum
from django.http import Http404, StreamingHttpResponse
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.spaces.models import GroupVisibility
from astron_console.spaces.permissions import (
    require_space_permission,
    resolve_scope,
    scope_queryset,
)

from . import clients, storage
from .common import dump, filename, json_value, number, owned, paginate, payload, save, text
from .models import Chunk, Directory, Document, ExtractionTask, HitHistory, PreviewChunk, Repo

logger = logging.getLogger(__name__)
TAGS = {"CBG-RAG", "AIUI-RAG2", "SparkDesk-RAG", "Ragflow-RAG"}


def scope_permission(request, key):
    scope = resolve_scope(request)
    if scope.space_id:
        require_space_permission(scope.uid, scope.space_id, key)
    return scope


def repository(request, identifier, key="RepoController_getDetail_GET"):
    if key == "RepoController_getDetail_GET":
        scope = resolve_scope(request)
        row = Repo.objects.filter(pk=number(identifier), deleted=False).first()
        shared = GroupVisibility.objects.filter(type=1, relation_id=str(identifier))
        shared = (
            shared.filter(space_id=scope.space_id)
            if scope.space_id
            else shared.filter(user_id=scope.uid, space_id__isnull=True)
        )
        if row and shared.exists():
            if scope.space_id:
                require_space_permission(scope.uid, scope.space_id, key)
            return row
    return owned(request, Repo, identifier, key, uid_field="user_id")


def document(request, identifier, key="FileController_getIndexingStatus_POST"):
    row = Document.objects.filter(pk=number(identifier)).first()
    if row is None:
        raise Http404("文件不存在")
    return row, repository(request, row.repo_id, key)


def knowledge_page(query, params, serializer=dump):
    page = paginate(query, params, serializer)
    return {
        "pageData": page["records"],
        "page": page["current"],
        "pageSize": page["size"],
        "totalCount": page["total"],
        "totalPages": page["pages"],
        "extMap": {},
    }


def validate_visibility(data):
    if "visibility" not in data:
        return
    visibility = number(data["visibility"], minimum=0)
    uids = data.get("uids", [])
    if (
        visibility not in (0, 1)
        or not isinstance(uids, list)
        or len(uids) > 500
        or any(not isinstance(uid, str) for uid in uids)
    ):
        raise ValidationError("无效共享设置")
    from astron_console.accounts.models import UserProfile

    if UserProfile.objects.filter(uid__in=uids, deleted=0, account_status=1).count() != len(
        set(uids)
    ):
        raise ValidationError("共享用户不存在")
    return visibility, uids


def set_visibility(request, repo, data):
    values = validate_visibility(data)
    if values is None:
        return
    visibility, uids = values
    with transaction.atomic():
        GroupVisibility.objects.filter(type=1, relation_id=str(repo.pk)).delete()
        if visibility:
            GroupVisibility.objects.bulk_create(
                [
                    GroupVisibility(
                        uid=request.user.pk,
                        user_id=uid,
                        type=1,
                        relation_id=str(repo.pk),
                        space_id=repo.space_id,
                    )
                    for uid in set(uids)
                ]
            )
        repo.visibility = visibility
        save(repo)


def repo_dump(repo):
    result = dump(repo)
    files = Document.objects.filter(repo_id=repo.pk)
    result.update(
        fileCount=files.count(),
        charCount=files.aggregate(n=Sum("char_count"))["n"] or 0,
        knowledgeCount=Chunk.objects.filter(
            file_id__in=files.values("uuid"), deleted=False
        ).count(),
        bots=[],
        tagDtoList=[],
        address="",
        corner=repo.tag,
    )
    return result


def file_dump(row):
    result = dump(row)
    if row.address and row.type != "html":
        result["downloadUrl"] = storage.download(row.address, name=row.name)
    elif row.type == "html":
        result["downloadUrl"] = row.address
    return result


def directory_dump(row):
    result = dump(row)
    result["isFile"] = int(row.is_file)
    if row.is_file:
        item = Document.objects.filter(pk=row.file_id).first()
        result["fileInfoV2"] = file_dump(item) if item else None
    return result


def check_references(table, column, identifier):
    """Read retained sibling references without loading or implementing sibling services."""
    if table not in connection.introspection.table_names():
        return
    quote = connection.ops.quote_name
    with connection.cursor() as cursor:
        cursor.execute(
            f"SELECT 1 FROM {quote(table)} WHERE {quote(column)} = %s LIMIT 1", [identifier]
        )
        if cursor.fetchone():
            raise ValidationError("资源仍被引用，不能删除")


def rag_params(repo, file):
    return {
        "ragType": repo.tag,
        "group": repo.core_repo_id,
        "datasetId": repo.ragflow_dataset_id,
        "docId": file.uuid,
        "uid": file.uid,
    }


@api_endpoint(["GET", "POST", "PUT", "DELETE"])
@clients.service_errors
def repos(request, action):
    p = payload(request)
    if action in ("list", "list-repos"):
        scope = scope_permission(request, "RepoController_listRepos_GET")
        shares = GroupVisibility.objects.filter(type=1)
        shares = (
            shares.filter(space_id=scope.space_id)
            if scope.space_id
            else shares.filter(user_id=scope.uid, space_id__isnull=True)
        )
        shared_ids = [
            int(value)
            for value in shares.values_list("relation_id", flat=True)
            if str(value).isdigit()
        ]
        owned_ids = scope_queryset(
            Repo.objects.filter(deleted=False), scope, uid_field="user_id"
        ).values("pk")
        query = Repo.objects.filter(Q(pk__in=owned_ids) | Q(pk__in=shared_ids), deleted=False)
        if p.get("content"):
            query = query.filter(name__icontains=p["content"])
        if p.get("tag"):
            query = query.filter(tag=p["tag"])
        return knowledge_page(query.order_by("-is_top", "-id"), p, repo_dump)
    if action == "create-repo" and request.method == "POST":
        scope = scope_permission(request, "RepoController_createRepo_POST")
        name = text(p.get("name"), 64)
        validate_visibility(p)
        tag = p.get("tag", "Ragflow-RAG")
        if tag not in TAGS:
            raise ValidationError("不支持的知识库类型")
        if scope_queryset(
            Repo.objects.filter(deleted=False, name=name), scope, uid_field="user_id"
        ).exists():
            raise ValidationError("知识库名称已存在")
        core_id = uuid.uuid4().hex
        row = Repo(
            name=name,
            user_id=scope.uid,
            space_id=scope.space_id,
            core_repo_id=core_id,
            outer_repo_id=core_id,
            tag=tag,
            description=p.get("desc", ""),
            icon=p.get("avatarIcon", ""),
            color=p.get("avatarColor", ""),
            status=1,
        )
        row.full_clean(
            exclude=[
                f.name for f in row._meta.fields if f.null and getattr(row, f.attname) is None
            ],
            validate_unique=False,
            validate_constraints=False,
        )
        if tag == "Ragflow-RAG":
            data = clients.rag(
                row,
                "/dataset/create",
                {"name": name + "-" + core_id, "description": row.description},
            )
            dataset_id = data.get("datasetId", data.get("id")) if isinstance(data, dict) else data
            if not isinstance(dataset_id, str) or not dataset_id:
                raise clients.ResourceServiceError("知识服务未返回数据集标识")
            row.ragflow_dataset_id = dataset_id
        save(row)
        set_visibility(request, row, p)
        logger.info("Created repository id=%s scope=%s", row.pk, scope.space_id)
        return repo_dump(row)
    key = {
        "update-repo": "RepoController_updateRepo_POST",
        "delete-repo": "RepoController_deleteRepo_DELETE",
        "enable-repo": "RepoController_enableRepo_PUT",
        "update-repo-status": "RepoController_updateRepo_POST",
        "set-top": "RepoController_updateRepo_POST",
    }.get(action, "RepoController_getDetail_GET")
    row = repository(request, p.get("id", p.get("repoId")), key)
    if action == "detail":
        return repo_dump(row)
    if action == "file-list":
        return [file_dump(x) for x in Document.objects.filter(repo_id=row.pk)]
    if action == "get-repo-use-status":
        try:
            check_references("flow_repo_rel", "repo_id", row.core_repo_id)
            check_references("bot_repo_rel", "repo_id", row.pk)
        except ValidationError:
            return True
        return False
    if action == "list-hit-test-history-by-page":
        return knowledge_page(HitHistory.objects.filter(repo_id=row.pk).order_by("-id"), p)
    if action == "hit-test":
        query = text(p.get("query"), 10000)
        match = {"repoId": [row.core_repo_id]}
        if row.ragflow_dataset_id:
            match["datasetId"] = [row.ragflow_dataset_id]
        enabled_files = Document.objects.filter(repo_id=row.pk, enabled=1)
        match["docIds"] = list(enabled_files.values_list("uuid", flat=True))
        if not match["docIds"]:
            return []
        data = clients.rag(
            row,
            "/chunk/query",
            {
                "query": query,
                "topN": min(number(p.get("topN"), 3), 5),
                "ragType": row.tag,
                "match": match,
                "rewrite": False,
            },
        )
        HitHistory.objects.create(repo_id=row.pk, user_id=request.user.pk, query=query)
        results = data.get("results") if isinstance(data, dict) else data
        if not isinstance(results, list):
            raise clients.ResourceServiceError("知识检索结果格式错误")
        docs = {file.uuid: file for file in enabled_files}
        return [
            {**item, "fileInfo": file_dump(docs[item["docId"]])}
            for item in results
            if isinstance(item, dict) and item.get("docId") in docs
        ]
    if request.method == "GET":
        raise ValidationError("修改操作需要 POST、PUT 或 DELETE")
    if action == "update-repo":
        validate_visibility(p)
        if "name" in p:
            row.name = text(p["name"], 64)
        for source, target in [
            ("desc", "description"),
            ("avatarIcon", "icon"),
            ("avatarColor", "color"),
        ]:
            if source in p:
                setattr(row, target, p[source])
    elif action in ("enable-repo", "update-repo-status"):
        row.status = number(p.get("enabled", p.get("status")), minimum=0)
    elif action == "set-top":
        row.is_top = not row.is_top
    elif action == "delete-repo":
        check_references("flow_repo_rel", "repo_id", row.core_repo_id)
        check_references("bot_repo_rel", "repo_id", row.pk)
        for file in Document.objects.filter(repo_id=row.pk):
            delete_document(file, row)
        Directory.objects.filter(app_id=str(row.pk)).delete()
        row.deleted = True
    else:
        raise Http404()
    save(row)
    if action == "update-repo":
        set_visibility(request, row, p)
    return repo_dump(row)


def parent_directory(repo, parent_id):
    parent_id = number(parent_id, -1, minimum=-1)
    if parent_id in (-1, 0):
        return -1
    if not Directory.objects.filter(pk=parent_id, app_id=str(repo.pk), is_file=False).exists():
        raise PermissionDenied("目录不属于此知识库")
    return parent_id


def store_document(request, repo, name, address, size, parent_id, extension):
    scope = resolve_scope(request)
    with transaction.atomic():
        row = save(
            Document(
                repo_id=repo.pk,
                uid=scope.uid,
                space_id=scope.space_id,
                uuid=uuid.uuid4().hex,
                name=name,
                address=address,
                size=size,
                char_count=0,
                type=extension,
                status=-1,
                pid=parent_id,
                source=repo.tag,
            )
        )
        Directory.objects.create(
            name=name, parent_id=parent_id, is_file=True, app_id=str(repo.pk), file_id=row.pk
        )
    return row


@api_endpoint(["POST"])
@clients.service_errors
def upload(request):
    p = request.POST
    repo = repository(request, p.get("repoId"), "FileController_uploadFile_POST")
    parent = parent_directory(repo, p.get("parentId"))
    file = request.FILES.get("file")
    if file is None or not 0 < file.size <= 100 * 1024 * 1024:
        raise ValidationError("请选择不超过100MB的文件")
    name = filename(file.name)
    key = "sparkBot/knowledge/" + str(repo.pk) + "/" + uuid.uuid4().hex + "/" + name
    storage.put(key, file, file.size, file.content_type or "application/octet-stream")
    try:
        row = store_document(
            request, repo, name, key, file.size, parent, name.rsplit(".", 1)[-1].lower()
        )
    except Exception:
        storage.remove(key)
        raise
    return file_dump(row)


def selected_files(request, p, key):
    ids = p.get("fileIds")
    if not isinstance(ids, list) or not ids or len(ids) > 100:
        raise ValidationError("请选择1到100个文件")
    return [document(request, identifier, key) for identifier in dict.fromkeys(ids)]


def slice_document(file, repo, config):
    task = ExtractionTask.objects.create(
        file_id=file.pk, task_id=file.uuid, user_id=file.uid, task_status=0
    )
    previous_status = file.status
    file.status = 0
    file.slice_config = json.dumps(config, ensure_ascii=False)
    save(file)
    try:
        params = {
            "ragType": repo.tag,
            "group": repo.core_repo_id,
            "datasetId": repo.ragflow_dataset_id,
        }
        if previous_status == 5 or file.last_uuid:
            params["documentId"] = file.last_uuid or file.uuid
        for key in ("lengthRange", "separator", "overlap", "titleSplit", "cutOff"):
            value = config.get(key, config.get("seperator") if key == "separator" else None)
            if value is not None:
                params[key] = value
        if file.type == "html":
            result = clients.rag(
                repo, "/document/split", {**params, "file": file.address, "resourceType": 1}
            )
        else:
            contents = storage.read(file.address)
            form = {
                k: json.dumps(v) if isinstance(v, (list, dict)) else str(v)
                for k, v in params.items()
                if v is not None
            }
            result = clients.rag(
                repo,
                "/document/upload",
                form,
                files={"file": (file.name, contents, "application/octet-stream")},
            )
        if isinstance(result, dict):
            chunks = result.get("chunks", result.get("chunkInfo", result.get("chunkInfos")))
        else:
            chunks = result
        if not isinstance(chunks, list) or not chunks:
            raise clients.ResourceServiceError("知识服务未返回分片")
        doc_id = str(chunks[0].get("docId") or file.uuid)
        with transaction.atomic():
            PreviewChunk.objects.filter(file_id__in=[file.uuid, file.last_uuid]).delete()
            for chunk in chunks:
                if not isinstance(chunk, dict) or not isinstance(chunk.get("content"), str):
                    raise clients.ResourceServiceError("知识服务返回分片格式错误")
                PreviewChunk.objects.create(
                    id=uuid.uuid4().hex,
                    file_id=doc_id,
                    content=json.dumps(chunk, ensure_ascii=False),
                    char_count=str(len(chunk["content"])),
                )
            file.last_uuid = doc_id
            file.status = 2
            file.reason = ""
            file.char_count = sum(len(c["content"]) for c in chunks)
            save(file)
            task.status = 1
            task.task_status = 1
            save(task)
        logger.info("Document split completed file=%s chunks=%s", file.pk, len(chunks))
    except Exception:
        Document.objects.filter(pk=file.pk).update(
            status=1, reason="文档解析失败，请检查平台配置后重试"
        )
        ExtractionTask.objects.filter(pk=task.pk).update(status=2, reason="文档解析失败")
        raise


def confirm_chunks(repo, result, count, *, saving):
    # Core wraps partial failures in code=0 responses, so the data must be checked too.
    if isinstance(result, dict) and result.get("failedChunk"):
        raise clients.ResourceServiceError("部分知识分片处理失败，请重试")
    if (
        saving
        and repo.tag in ("Ragflow-RAG", "CBG-RAG")
        and (not isinstance(result, list) or len(result) != count)
    ):
        raise clients.ResourceServiceError("知识服务未确认全部分片")


def chunk_content(content, identifier, doc_id):
    content = json_value(content, {})
    if not isinstance(content, dict):
        raise clients.ResourceServiceError("知识分片内容格式错误")
    return {
        **content,
        "chunkId": identifier,
        "id": identifier,
        "dataIndex": identifier,
        "docId": doc_id,
    }


def saved_chunk_contents(repo, result, submitted):
    confirm_chunks(repo, result, len(submitted), saving=True)
    returned = result if isinstance(result, list) else (result or {}).get("chunks", [])
    mapped = []
    identifiers = set()
    for index, content in enumerate(submitted):
        actual = returned[index] if index < len(returned) else None
        identifier = (
            (actual.get("chunkId") or actual.get("id") or actual.get("dataIndex"))
            if isinstance(actual, dict)
            else None
        )
        if identifier is None and repo.tag in ("Ragflow-RAG", "CBG-RAG"):
            raise clients.ResourceServiceError("知识服务未返回分片标识")
        identifier = str(identifier if identifier is not None else content["chunkId"])
        if not identifier or len(identifier) > 64 or identifier in identifiers:
            raise clients.ResourceServiceError("知识服务返回无效或重复分片标识")
        identifiers.add(identifier)
        mapped.append(chunk_content(content, identifier, content["docId"]))
    return mapped


def save_chunk(row, content):
    old_id = row.pk
    identifier = content["chunkId"]
    with transaction.atomic():
        if (row._state.adding or identifier != old_id) and Chunk.objects.filter(
            pk=identifier
        ).exists():
            raise clients.ResourceServiceError("知识服务返回的分片标识已被占用")
        if not row._state.adding and identifier != old_id:
            Chunk.objects.filter(pk=old_id).update(id=identifier)
        row.id = identifier
        row.content = json.dumps(content, ensure_ascii=False)
        row.updated_at = timezone.now()
        save(row)
    return row


def delete_remote_chunks(repo, file, identifiers):
    identifiers = list(dict.fromkeys(identifiers))
    if identifiers:
        result = clients.rag(
            repo, "/chunk/delete", {**rag_params(repo, file), "chunkIds": identifiers}
        )
        confirm_chunks(repo, result, len(identifiers), saving=False)


def preview_chunk_content(row, doc_id):
    content = json_value(row.content, {})
    if not isinstance(content, dict):
        raise clients.ResourceServiceError("知识分片内容格式错误")
    # Split has already created provider chunks. In particular, RAGFlow uses
    # dataIndex to find them; the local preview row ID is only a fallback.
    content = {**content, "docId": doc_id}
    if content.get("chunkId") in (None, ""):
        identifier = next(
            (content[key] for key in ("id", "dataIndex") if content.get(key) not in (None, "")),
            row.pk,
        )
        content["chunkId"] = str(identifier)
    return content


def embed_document(file, repo):
    doc_id = file.last_uuid or file.uuid
    previews = list(
        PreviewChunk.objects.filter(file_id=doc_id, deleted=False).order_by("seq_id", "created_at")
    )
    if not previews:
        raise ValidationError("请先切分文件")
    file.status = 3
    save(file)
    task = ExtractionTask.objects.create(
        file_id=file.pk, task_id=doc_id, user_id=file.uid, task_status=2
    )
    try:
        chunks = [preview_chunk_content(row, doc_id) for row in previews]
        result = clients.rag(
            repo, "/chunks/save", {**rag_params(repo, file), "docId": doc_id, "chunks": chunks}
        )
        saved = saved_chunk_contents(repo, result, chunks)
        with transaction.atomic():
            Chunk.objects.filter(file_id=file.uuid, source=True).update(deleted=True, enabled=False)
            for index, row in enumerate(previews):
                content = saved[index]
                chunk_id = content["chunkId"]
                if (
                    Chunk.objects.filter(pk=chunk_id)
                    .exclude(file_id__in=[file.uuid, doc_id])
                    .exists()
                ):
                    raise clients.ResourceServiceError("知识服务返回的分片标识已被占用")
                Chunk.objects.update_or_create(
                    id=chunk_id,
                    defaults={
                        "file_id": doc_id,
                        "content": json.dumps(content, ensure_ascii=False),
                        "char_count": row.char_count,
                        "source": True,
                        "enabled": True,
                        "deleted": False,
                        "core_repo_name": repo.core_repo_id,
                    },
                )
            file.uuid = doc_id
            file.status = 5
            file.enabled = 1
            file.current_slice_config = file.slice_config
            save(file)
            task.status = 1
            task.task_status = 3
            save(task)
    except Exception:
        Document.objects.filter(pk=file.pk).update(status=4, reason="向量化失败，请重试")
        ExtractionTask.objects.filter(pk=task.pk).update(status=2, reason="向量化失败")
        raise


def delete_document(file, repo):
    delete_remote_chunks(
        repo,
        file,
        Chunk.objects.filter(file_id=file.uuid, deleted=False, enabled=True).values_list(
            "id", flat=True
        ),
    )
    if file.type != "html" and file.address:
        storage.remove(file.address)
    with transaction.atomic():
        Chunk.objects.filter(file_id=file.uuid).update(deleted=True, enabled=False)
        PreviewChunk.objects.filter(file_id__in=[file.uuid, file.last_uuid]).delete()
        Directory.objects.filter(file_id=file.pk, is_file=True).delete()
        file.delete()


def chunk_dump(row):
    result = dump(row)
    result["content"] = json_value(row.content, {"content": row.content})
    result["tagDtoList"] = []
    file = Document.objects.filter(Q(uuid=row.file_id) | Q(last_uuid=row.file_id)).first()
    result["fileInfoV2"] = dump(file) if file else None
    result["fileName"] = file.name if file else ""
    return result


@api_endpoint(["GET", "POST", "PUT", "DELETE"])
@clients.service_errors
def files(request, action):
    p = payload(request)
    if action in (
        "slice",
        "embedding",
        "embedding-back",
        "retry",
        "file-indexing-status",
        "file-summary",
        "list-preview-knowledge-by-page",
        "list-knowledge-by-page",
        "download-knowledge-by-violation",
    ):
        selected = selected_files(
            request,
            p,
            "FileController_getIndexingStatus_POST"
            if action == "file-indexing-status"
            else (
                "FileController_uploadFile_POST"
                if action in ("slice", "retry", "embedding", "embedding-back")
                else "RepoController_getDetail_GET"
            ),
        )
        if action == "file-indexing-status":
            return [
                {**dump(file), "fileId": file.pk, "fileName": file.name} for file, _ in selected
            ]
        if action in ("slice", "retry", "embedding", "embedding-back"):
            if request.method == "GET":
                raise ValidationError("需要POST")
            for file, repo in selected:
                if action in ("slice", "retry", "embedding-back"):
                    slice_document(
                        file,
                        repo,
                        p.get("sliceConfig") or {"lengthRange": [256, 512], "separator": ["\n"]},
                    )
                if action in ("embedding", "embedding-back"):
                    embed_document(file, repo)
            return True
        if action == "file-summary":
            file = selected[0][0]
            chunks = Chunk.objects.filter(file_id__in=[f.uuid for f, _ in selected], deleted=False)
            count = chunks.count()
            total = sum(int(chunk.char_count or 0) for chunk in chunks)
            config = json_value(file.current_slice_config or file.slice_config, {})
            directory = Directory.objects.filter(file_id=file.pk).first()
            return {
                "sliceType": config.get("type", 0),
                "seperator": config.get("seperator", config.get("separator", [])),
                "lengthRange": config.get("lengthRange", [256, 512]),
                "knowledgeCount": count,
                "knowledgeTotalLength": total,
                "knowledgeAvgLength": total // count if count else 0,
                "hitCount": sum(chunk.dialog_hit_count or 0 for chunk in chunks),
                "fileInfoV2": file_dump(file),
                "fileDirectoryTreeId": directory.pk if directory else None,
            }
        model = (
            PreviewChunk
            if (
                action == "list-preview-knowledge-by-page"
                or (action == "download-knowledge-by-violation" and not p.get("source"))
            )
            else Chunk
        )
        ids = (
            [f.last_uuid or f.uuid for f, _ in selected]
            if model == PreviewChunk
            else [f.uuid for f, _ in selected]
        )
        query = model.objects.filter(file_id__in=ids, deleted=False)
        if p.get("query"):
            query = query.filter(content__icontains=p["query"])
        if action == "download-knowledge-by-violation":
            from .databases import export_xlsx

            names = {f.last_uuid or f.uuid: f.name for f, _ in selected}
            names.update({f.uuid: f.name for f, _ in selected})
            rows = []
            for chunk in query.order_by("file_id", "seq_id"):
                content = json_value(chunk.content, {})
                if not isinstance(content, dict) or content.get("auditSuggest") not in (
                    "block",
                    "review",
                ):
                    continue
                details = content.get("auditDetail", [])
                audit = (
                    "\n".join(
                        str(item.get("categoryDescription", ""))
                        + ":"
                        + str(item.get("confidence", ""))
                        for item in details
                        if isinstance(item, dict)
                    )
                    if isinstance(details, list)
                    else ""
                )
                rows.append(
                    {
                        "序号": len(rows) + 1,
                        "文件名": names.get(chunk.file_id, ""),
                        "内容": content.get("knowledge", content.get("content", "")),
                        "审核详情": audit,
                    }
                )
            return export_xlsx(rows, ["序号", "文件名", "内容", "审核详情"], "violations")
        result = knowledge_page(query.order_by("seq_id", "created_at"), p, chunk_dump)
        result["fileSliceCount"] = {
            str(file.pk): query.filter(file_id=file.last_uuid or file.uuid).count()
            for file, _ in selected
        }
        return result
    if action == "get-file-info-by-source-id":
        file = Document.objects.filter(uuid=p.get("sourceId")).first()
        if not file:
            raise Http404()
        repository(request, file.repo_id)
        return file_dump(file)
    if action in ("query-file-list", "search-file", "create-folder", "create-html-file"):
        repo = repository(
            request,
            p.get("repoId"),
            "FileController_uploadFile_POST"
            if request.method != "GET"
            else "RepoController_getDetail_GET",
        )
        parent = parent_directory(repo, p.get("parentId", p.get("pid")))
        if action == "query-file-list":
            query = Directory.objects.filter(app_id=str(repo.pk), parent_id=parent).order_by(
                "is_file", "id"
            )
            return knowledge_page(query, p, directory_dump)
        if action == "search-file":
            query = Directory.objects.filter(
                app_id=str(repo.pk), name__icontains=p.get("fileName", "")
            )
            return StreamingHttpResponse(
                ("data: " + json.dumps(directory_dump(row), default=str) + "\n\n" for row in query),
                content_type="text/event-stream",
            )
        if request.method != "POST":
            raise ValidationError("需要POST")
        if action == "create-folder":
            return dump(
                save(
                    Directory(
                        app_id=str(repo.pk),
                        parent_id=parent,
                        name=filename(p.get("name")),
                        status=True,
                    )
                )
            )
        urls = p.get("htmlAddressList")
        if not isinstance(urls, list) or not urls or len(urls) > 20:
            raise ValidationError("请输入网页URL")
        result = []
        for url in urls:
            parsed = urlsplit(text(url, 2048))
            if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username:
                raise ValidationError("无效的网页URL")
            # Fetching is delegated to the existing knowledge service, never to Console.
            result.append(
                dump(
                    store_document(
                        request, repo, p.get("name") or parsed.hostname, url, 0, parent, "html"
                    )
                )
            )
        return result
    if action == "list-file-directory-tree":
        repo = repository(request, p["repoId"]) if p.get("repoId") else None
        entry_id = number(p.get("fileId"), -1, minimum=-1)
        if entry_id in (-1, 0):
            if repo is None:
                raise ValidationError("缺少知识库标识")
            return []
        entry = Directory.objects.filter(pk=entry_id).first()
        if not entry:
            raise Http404()
        if repo is None:
            repo = repository(request, entry.app_id)
        elif entry.app_id != str(repo.pk):
            raise PermissionDenied("目录不属于此知识库")
        path = []
        seen = set()
        while entry is not None:
            if entry.pk in seen:
                raise ValidationError("目录关系无效")
            seen.add(entry.pk)
            path.insert(0, dump(entry))
            if entry.parent_id in (None, -1, 0):
                break
            entry = Directory.objects.filter(
                pk=entry.parent_id, app_id=str(repo.pk), is_file=False
            ).first()
            if entry is None:
                raise ValidationError("父目录不存在或不属于此知识库")
        return path
    if request.method == "GET":
        raise ValidationError("修改操作不能使用GET")
    if action in ("update-folder", "update-file", "delete-folder"):
        row = Directory.objects.filter(pk=number(p.get("id"))).first()
        if not row:
            raise Http404()
        repo = repository(request, row.app_id, "FileController_uploadFile_POST")
        if action == "delete-folder":
            remove_directory(row, repo)
            return None
        row.name = filename(p.get("name"))
        save(row)
        if row.is_file:
            Document.objects.filter(pk=row.file_id, repo_id=repo.pk).update(name=row.name)
        return dump(row)
    entry = Directory.objects.filter(pk=number(p.get("id")), is_file=True).first()
    if entry is None:
        raise Http404()
    file, repo = document(
        request,
        entry.file_id,
        "RepoController_deleteRepo_DELETE"
        if action == "delete-file"
        else "RepoController_enableRepo_PUT",
    )
    if action == "delete-file":
        if p.get("repoId") and number(p["repoId"]) != repo.pk:
            raise PermissionDenied()
        delete_document(file, repo)
        return None
    if action == "enable-file":
        enabled = number(p.get("enabled"), minimum=0)
        if enabled not in (0, 1):
            raise ValidationError("无效状态")
        rows = list(Chunk.objects.filter(file_id=file.uuid, deleted=False).order_by("seq_id", "id"))
        saved = []
        to_enable = [row for row in rows if not row.enabled]
        if enabled and to_enable:
            submitted = [chunk_content(row.content, row.pk, file.uuid) for row in to_enable]
            result = clients.rag(
                repo, "/chunks/save", {**rag_params(repo, file), "chunks": submitted}
            )
            saved = saved_chunk_contents(repo, result, submitted)
        elif not enabled:
            delete_remote_chunks(repo, file, [row.pk for row in rows if row.enabled])
        with transaction.atomic():
            if enabled:
                for row, content in zip(to_enable, saved, strict=True):
                    row.enabled = True
                    save_chunk(row, content)
            else:
                Chunk.objects.filter(file_id=file.uuid, deleted=False).update(enabled=False)
            file.enabled = enabled
            save(file)
        return None
    raise Http404()


def remove_directory(row, repo, seen=None):
    seen = seen or set()
    if row.pk in seen:
        raise ValidationError("目录关系无效")
    seen.add(row.pk)
    for child in Directory.objects.filter(parent_id=row.pk, app_id=str(repo.pk)):
        remove_directory(child, repo, seen)
    if row.is_file:
        file = Document.objects.filter(pk=row.file_id, repo_id=repo.pk).first()
        if file:
            delete_document(file, repo)
    row.delete()


@api_endpoint(["POST", "PUT", "DELETE"])
@clients.service_errors
def chunks(request, action):
    p = {**request.GET.dict(), **payload(request)}
    if action == "create-knowledge":
        file, repo = document(request, p.get("fileId"), "KnowledgeController_createKnowledge_POST")
        row = Chunk(
            id=uuid.uuid4().hex,
            file_id=file.uuid,
            source=False,
            enabled=bool(file.enabled),
            core_repo_name=repo.core_repo_id,
        )
    else:
        row = Chunk.objects.filter(pk=p.get("id"), deleted=False).first()
        if not row:
            raise Http404()
        file = Document.objects.filter(uuid=row.file_id).first()
        if not file:
            raise Http404()
        key = {
            "update-knowledge": "KnowledgeController_updateKnowledge_POST",
            "delete-knowledge": "KnowledgeController_deleteKnowledge_DELETE",
            "enable-knowledge": "KnowledgeController_enableKnowledge_PUT",
        }.get(action)
        if key is None:
            raise Http404()
        repo = repository(request, file.repo_id, key)
    base = rag_params(repo, file)
    if action in ("create-knowledge", "update-knowledge"):
        content = text(p.get("content"), 1000000)
        chunk = {**chunk_content(row.content, row.id, file.uuid), "content": content}
        result = clients.rag(
            repo,
            "/chunks/save" if action == "create-knowledge" else "/chunk/update",
            {**base, "chunks": [chunk]},
        )
        confirm_chunks(repo, result, 1, saving=action == "create-knowledge")
        if action == "create-knowledge":
            chunk = saved_chunk_contents(repo, result, [chunk])[0]
            row.enabled = True
        row.char_count = str(len(content))
        return chunk_dump(save_chunk(row, chunk))
    elif action == "delete-knowledge":
        delete_remote_chunks(repo, file, [row.id] if row.enabled else [])
        row.deleted = True
        row.enabled = False
    elif action == "enable-knowledge":
        enabled = number(p.get("enabled"), minimum=0)
        if enabled not in (0, 1):
            raise ValidationError("无效状态")
        if enabled and not row.enabled:
            submitted = [chunk_content(row.content, row.id, file.uuid)]
            result = clients.rag(repo, "/chunks/save", {**base, "chunks": submitted})
            content = saved_chunk_contents(repo, result, submitted)[0]
            row.enabled = True
            return chunk_dump(save_chunk(row, content))
        elif not enabled:
            delete_remote_chunks(repo, file, [row.id] if row.enabled else [])
        row.enabled = bool(enabled)
    else:
        raise Http404()
    row.updated_at = timezone.now()
    save(row)
    return chunk_dump(row)
