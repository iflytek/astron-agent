"""Database resources: metadata in Console, schema and rows in core/memory/database."""

import io
import json
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from alembic.migration import MigrationContext
from alembic.operations import Operations
from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import Http404, HttpResponse
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    MetaData,
    String,
    Table,
    delete,
    func,
    insert,
    select,
    update,
)
from sqlalchemy.dialects import mysql, postgresql
from sqlalchemy.engine import BindTyping
from sqlalchemy.schema import CreateTable, DropTable
from sqlalchemy.sql.elements import quoted_name

from astron_console.http import api_endpoint
from astron_console.spaces.permissions import resolve_scope, scope_queryset

from . import clients
from .common import dump, number, owned, paginate, payload, save, text, validate
from .models import Database, DatabaseField, DatabaseTable
from .views import check_references, scope_permission

SYSTEM_FIELDS = {"id", "uid", "create_time"}
TYPES = {
    "String": lambda: String(1024),
    "Integer": BigInteger,
    "Time": DateTime,
    "Number": Float,
    "Boolean": Boolean,
}


def dialect():
    return (
        mysql.dialect(paramstyle="named")
        if getattr(settings, "SPARK_DB_TYPE", "postgresql") == "mysql"
        else postgresql.dialect(paramstyle="named")
    )


def identifier(value):
    name = text(value, 64)
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise ValidationError("表名和字段名仅支持字母、数字、下划线且不能以数字开头")
    return name


def database(request, id, key="DataBaseController_getDatabaseInfo_GET"):
    return owned(request, Database, id, key)


def table_access(request, id, key="DataBaseController_getDbTableList_GET"):
    row = DatabaseTable.objects.filter(pk=number(id), deleted=False).first()
    if not row:
        raise Http404()
    return row, database(request, row.db_id, key)


def core_payload(db, request):
    scope = resolve_scope(request)
    return {"database_id": db.db_id, "uid": scope.uid, "space_id": str(scope.space_id or "")}


def data_row(row):
    """Snowflake identifiers must survive JSON/Excel round trips without numeric rounding."""
    return {**row, "id": str(row["id"])} if row.get("id") is not None else row


def ddl(request, db, statement):
    sql = str(statement.compile(dialect=dialect())) if not isinstance(statement, str) else statement
    return clients.database("exec_ddl", {**core_payload(db, request), "ddl": sql.rstrip(";\n ")})


def dml(request, db, statement, env):
    env = number(env, 1)
    if env not in (1, 2):
        raise ValidationError("请选择测试或生产环境")
    transport_dialect = dialect()
    # Core receives textual SQL and binds params itself; driver-specific ::TYPE casts
    # obscure the named placeholders when Core parses that text a second time.
    transport_dialect.bind_typing = BindTyping.NONE
    compiled = statement.compile(
        dialect=transport_dialect, compile_kwargs={"render_postcompile": True}
    )
    data = clients.database(
        "exec_dml",
        {
            **core_payload(db, request),
            "app_id": db.app_id or getattr(settings, "MAAS_APP_ID", ""),
            "dml": str(compiled),
            "params": compiled.params,
            "env": "test" if env == 1 else "prod",
        },
    )
    if not isinstance(data, dict) or "exec_success" not in data:
        raise clients.ResourceServiceError("数据库服务返回格式错误")
    rows = data["exec_success"]
    if isinstance(rows, str):
        try:
            rows = json.loads(rows)
        except ValueError:
            raise clients.ResourceServiceError("数据库服务返回格式错误") from None
    return rows


def column(field):
    if not re.fullmatch(r"[A-Za-z_]+", str(field.get("name", ""))):
        raise ValidationError("字段名仅支持英文字母和下划线")
    if field["type"] not in TYPES:
        raise ValidationError("不支持的字段类型")
    return Column(
        identifier(field["name"]),
        TYPES[field["type"]](),
        nullable=not field.get("isRequired", False),
        quote=True,
    )


def table_schema(row):
    fields = list(DatabaseField.objects.filter(tb_id=row.pk))
    columns = [
        Column("id", BigInteger, primary_key=True, autoincrement=True),
        Column("uid", String(64), nullable=False),
        Column("create_time", DateTime, nullable=False, server_default=func.now()),
    ]
    columns.extend(column(dump(field)) for field in fields if field.name not in SYSTEM_FIELDS)
    return Table(identifier(row.name), MetaData(), *columns, quote=True)


def validate_fields(fields):
    if not isinstance(fields, list) or not fields or len(fields) > 23:
        raise ValidationError("字段数量必须为1到23个（包含系统字段）")
    names = set()
    for field in fields:
        if not isinstance(field, dict):
            raise ValidationError("无效字段")
        name = identifier(field.get("name"))
        if name in names:
            raise ValidationError("字段名称重复")
        names.add(name)
        if name not in SYSTEM_FIELDS:
            if field.get("type") not in TYPES:
                raise ValidationError("不支持的字段类型")
            column(field)
        validate(
            DatabaseField(
                tb_id=1,
                name=name,
                type=field.get("type", "String"),
                description=field.get("description", ""),
                default_value=str(field.get("defaultValue", "")),
                is_required=field.get("isRequired", False),
                is_system=name in SYSTEM_FIELDS,
            )
        )
    return fields


def create_table(request, db, p):
    name = identifier(p.get("name"))
    if DatabaseTable.objects.filter(db_id=db.pk, name=name, deleted=False).exists():
        raise ValidationError("表名已存在")
    fields = validate_fields(p.get("fields"))
    row = validate(DatabaseTable(db_id=db.pk, name=name, description=p.get("description", "")))
    cols = [
        Column("id", BigInteger, primary_key=True, autoincrement=True),
        Column("uid", String(64), nullable=False),
        Column("create_time", DateTime, nullable=False, server_default=func.now()),
    ]
    cols += [column(f) for f in fields if f["name"] not in SYSTEM_FIELDS]
    ddl(request, db, CreateTable(Table(name, MetaData(), *cols, quote=True)))
    save(row)
    merged = [
        {"name": "id", "type": "Integer"},
        {"name": "uid", "type": "String"},
        {"name": "create_time", "type": "Time"},
    ]
    merged += [f for f in fields if f["name"] not in SYSTEM_FIELDS]
    for field in merged:
        save(
            DatabaseField(
                tb_id=row.pk,
                name=field["name"],
                type=field["type"],
                description=field.get("description", ""),
                default_value=str(field.get("defaultValue", "")),
                is_required=field.get("isRequired", False),
                is_system=field["name"] in SYSTEM_FIELDS,
            )
        )
    return row


def change_table(request, row, db, p):
    name = identifier(p.get("name", row.name))
    if (
        DatabaseTable.objects.filter(db_id=db.pk, name=name, deleted=False)
        .exclude(pk=row.pk)
        .exists()
    ):
        raise ValidationError("表名已存在")
    validate(
        DatabaseTable(
            id=row.pk, db_id=db.pk, name=name, description=p.get("description", row.description)
        )
    )
    fields = p.get("fields", [])
    if fields:
        validate_fields(fields)
    for incoming in fields:
        existing = (
            DatabaseField.objects.filter(pk=incoming.get("id"), tb_id=row.pk).first()
            if incoming.get("id")
            else None
        )
        if incoming["name"] in SYSTEM_FIELDS or (existing and existing.is_system):
            continue
        operation = number(incoming.get("operateType"), 2 if existing else 1)
        stream = io.StringIO()
        ops = Operations(
            MigrationContext.configure(
                dialect=dialect(), opts={"as_sql": True, "output_buffer": stream}
            )
        )
        if operation == 1:
            if DatabaseField.objects.filter(tb_id=row.pk, name=incoming["name"]).exists():
                raise ValidationError("字段名称已存在")
            ops.add_column(quoted_name(row.name, True), column(incoming))
        elif operation == 2 and existing:
            ops.alter_column(
                quoted_name(row.name, True),
                quoted_name(existing.name, True),
                new_column_name=quoted_name(identifier(incoming["name"]), True),
                type_=TYPES[incoming["type"]](),
                existing_type=TYPES[existing.type](),
                nullable=not incoming.get("isRequired", False),
                existing_nullable=not existing.is_required,
            )
        elif operation == 4 and existing:
            ops.drop_column(quoted_name(row.name, True), quoted_name(existing.name, True))
        else:
            raise ValidationError("无效字段操作")
        # Alembic only emits statements from validated identifiers/types, no user SQL is accepted.
        for sql in stream.getvalue().split(";"):
            if sql.strip():
                ddl(request, db, sql.strip())
        if operation == 4:
            existing.delete()
        else:
            field = existing or DatabaseField(tb_id=row.pk)
            field.name = incoming["name"]
            field.type = incoming["type"]
            field.description = incoming.get("description", "")
            field.is_required = incoming.get("isRequired", False)
            field.default_value = str(incoming.get("defaultValue", ""))
            save(field)
    name = identifier(p.get("name", row.name))
    if name != row.name:
        if (
            DatabaseTable.objects.filter(db_id=db.pk, name=name, deleted=False)
            .exclude(pk=row.pk)
            .exists()
        ):
            raise ValidationError("表名已存在")
        stream = io.StringIO()
        ops = Operations(
            MigrationContext.configure(
                dialect=dialect(), opts={"as_sql": True, "output_buffer": stream}
            )
        )
        ops.rename_table(quoted_name(row.name, True), quoted_name(name, True))
        ddl(request, db, stream.getvalue())
        row.name = name
    row.description = p.get("description", row.description)
    return save(row)


def convert(value, field):
    if value in ("", None):
        if field.is_required and field.default_value in ("", None):
            raise ValidationError("必填字段不能为空")
        value = field.default_value if field.default_value not in ("", None) else None
    if value is None:
        return None
    try:
        if field.type == "String":
            if not isinstance(value, str) or len(value) > 1024:
                raise ValueError()
            return value
        if field.type == "Integer":
            if isinstance(value, bool) or str(int(value)) != str(value):
                raise ValueError()
            return int(value)
        if field.type == "Number":
            result = Decimal(str(value))
            if not result.is_finite():
                raise ValueError()
            return float(result)
        if field.type == "Boolean":
            if value not in (True, False, 0, 1, "true", "false", "0", "1"):
                raise ValueError()
            return value in (True, 1, "true", "1")
        if field.type == "Time":
            return datetime.fromisoformat(str(value)).isoformat()
    except (ValueError, TypeError, InvalidOperation, OverflowError):
        raise ValidationError("字段类型错误：" + field.name) from None
    raise ValidationError("字段类型不支持")


def operate_rows(request, row, db, operations, env):
    if not isinstance(operations, list) or not operations or len(operations) > 1000:
        raise ValidationError("每次提交1到1000行")
    schema = table_schema(row)
    fields = {f.name: f for f in DatabaseField.objects.filter(tb_id=row.pk) if not f.is_system}
    prepared = []
    for operation in operations:
        values = operation.get("tableData")
        if not isinstance(values, dict) or set(values) - set(fields) - SYSTEM_FIELDS:
            raise ValidationError("数据含未知字段")
        kind = operation.get("operateType")
        if kind in (2, 4):
            row_id = number(values.get("id"))
        if kind == 4:
            statement = delete(schema).where(schema.c.id == row_id)
        elif kind in (1, 2):
            data = {
                name: convert(value, fields[name])
                for name, value in values.items()
                if name in fields
            }
            if kind == 1:
                for name, field in fields.items():
                    if name not in data:
                        data[name] = convert(None, field)
                statement = insert(schema).values(**data)
            else:
                if not data:
                    raise ValidationError("没有需要修改的数据")
                statement = update(schema).where(schema.c.id == row_id).values(**data)
        else:
            raise ValidationError("不支持的数据操作")
        prepared.append(statement)
    for statement in prepared:
        dml(request, db, statement, env)


def export_xlsx(rows, headers, name):
    from openpyxl import Workbook

    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet("data")
    sheet.append(headers)
    for row in rows:
        # Export strings as text, including formula-looking user content.
        from openpyxl.cell import WriteOnlyCell

        cells = []
        for key in headers:
            value = row.get(key)
            cell = WriteOnlyCell(sheet, value=value)
            if isinstance(value, str):
                cell.data_type = "s"
            cells.append(cell)
        sheet.append(cells)
    data = io.BytesIO()
    workbook.save(data)
    return HttpResponse(
        data.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{name}.xlsx"'},
    )


def import_xlsx(file):
    from openpyxl import load_workbook

    if file is None or file.size > 20 * 1024 * 1024 or not file.name.lower().endswith(".xlsx"):
        raise ValidationError("请选择不超过20MB的xlsx文件")
    try:
        workbook = load_workbook(file, read_only=True, data_only=True)
        rows = workbook.active.iter_rows(values_only=True)
        names = next(rows)
        result = []
        for values in rows:
            if len(result) >= 1000:
                raise ValidationError("每次最多导入1000行")
            if any(v is not None for v in values):
                result.append(
                    {
                        str(name): value
                        for name, value in zip(names, values, strict=False)
                        if name is not None
                    }
                )
        workbook.close()
        return result
    except (ValueError, KeyError, StopIteration):
        raise ValidationError("无法读取工作表") from None


@api_endpoint(["GET", "POST", "PUT", "DELETE"])
@clients.service_errors
def databases(request, action):
    p = payload(request)
    permission = {
        "detail": "DataBaseController_getDatabaseInfo_GET",
        "update": "DataBaseController_updateDatabase_POST",
        "delete": "DataBaseController_deleteDatabase_GET",
        "copy": "DataBaseController_createDatabase_POST",
        "table-list": "DataBaseController_getDbTableList_GET",
        "create-table": "DataBaseController_createDbTable_POST",
        "table-field-list": "DataBaseController_getDbTableFieldList_POST",
        "update-table": "DataBaseController_updateTable_POST",
        "delete-table": "DataBaseController_deleteTable_GET",
        "operate-table-data": "DataBaseController_operateTableData_POST",
        "select-table-data": "DataBaseController_selectTableData_POST",
        "copy-table": "DataBaseController_createDbTable_POST",
        "import-table-data": "DataBaseController_importTableData_POST",
        "export-table-data": "DataBaseController_exportTableData_POST",
        "table-template": "DataBaseController_getTableTemplateFile_GET",
    }.get(action, "DataBaseController_selectDatabase_POST")

    read_actions = {
        "detail",
        "page-list",
        "table-list",
        "db_table-list",
        "table-field-list",
        "select-table-data",
        "table-template",
        "export-table-data",
    }
    if action not in read_actions and request.method == "GET":
        raise ValidationError("修改操作需要POST或DELETE")
    if action in ("page-list", "db_table-list"):
        scope = scope_permission(request, "DataBaseController_selectDatabase_POST")
        query = scope_queryset(Database.objects.filter(deleted=False), scope)
        if p.get("search"):
            query = query.filter(name__icontains=p["search"])
        if action == "db_table-list":
            return [
                {
                    "value": str(db.pk),
                    "label": db.name,
                    "children": [
                        {"value": str(t.pk), "label": t.name}
                        for t in DatabaseTable.objects.filter(db_id=db.pk, deleted=False)
                    ],
                }
                for db in query
            ]
        return paginate(query.order_by("-id"), p)
    if action == "create":
        scope = scope_permission(request, "DataBaseController_createDatabase_POST")
        name = text(p.get("name"), 100)
        if scope_queryset(Database.objects.filter(deleted=False, name=name), scope).exists():
            raise ValidationError("数据库名称已存在")
        row = validate(
            Database(
                uid=scope.uid,
                space_id=scope.space_id,
                app_id=getattr(settings, "MAAS_APP_ID", ""),
                name=name,
                description=p.get("description", ""),
                avatar_icon=p.get("avatarIcon", ""),
                avatar_color=p.get("avatarColor", ""),
            )
        )
        data = clients.database(
            "create_database",
            {
                "database_name": "db_" + __import__("uuid").uuid4().hex[:16],
                "uid": scope.uid,
                "space_id": str(scope.space_id or ""),
                "description": row.description,
            },
        )
        if not isinstance(data, dict) or not isinstance(data.get("database_id"), int):
            raise clients.ResourceServiceError("数据库服务未返回标识")
        row.db_id = data["database_id"]
        save(row)
        return dump(row)
    if action == "import-field-list":
        scope_permission(request, "DataBaseController_createDbTable_POST")
        return import_xlsx(request.FILES.get("file"))
    if action in ("detail", "update", "delete", "copy", "table-list", "create-table"):
        db = database(
            request,
            p.get("dbId") if action in ("table-list", "create-table") else p.get("id"),
            permission,
        )
        if action == "detail":
            return dump(db)
        if action == "table-list":
            return [dump(row) for row in DatabaseTable.objects.filter(db_id=db.pk, deleted=False)]
        if action == "create-table":
            return dump(create_table(request, db, p))
        if action == "update":
            for source, target in [
                ("name", "name"),
                ("description", "description"),
                ("avatarIcon", "avatar_icon"),
                ("avatarColor", "avatar_color"),
            ]:
                if source in p:
                    setattr(db, target, p[source])
            validate(db)
            clients.database(
                "modify_db_description",
                {**core_payload(db, request), "description": p.get("description", db.description)},
            )
            save(db)
            return dump(db)
        if action == "delete":
            check_references("flow_db_rel", "db_id", str(db.db_id))
            clients.database("drop_database", core_payload(db, request))
            db.deleted = True
            save(db)
            return None
        if action == "copy":
            scope = resolve_scope(request)
            name = text(p.get("name", db.name + "副本"), 100)
            data = clients.database(
                "create_database",
                {
                    "database_name": "db_" + __import__("uuid").uuid4().hex[:16],
                    "uid": scope.uid,
                    "space_id": str(scope.space_id or ""),
                    "description": db.description or "",
                },
            )
            target = save(
                Database(
                    uid=scope.uid,
                    space_id=scope.space_id,
                    app_id=db.app_id,
                    db_id=data["database_id"],
                    name=name,
                    description=db.description,
                )
            )
            for source in DatabaseTable.objects.filter(db_id=db.pk, deleted=False):
                copy_table(request, source, db, target, source.name)
            return dump(target)
    row, db = table_access(
        request,
        p.get("tbId", p.get("id")),
        permission,
    )
    if action == "table-field-list":
        return paginate(DatabaseField.objects.filter(tb_id=row.pk).order_by("id"), p)
    if action == "update-table":
        return dump(change_table(request, row, db, p))
    if action == "delete-table":
        check_references("flow_db_rel", "tb_id", row.pk)
        ddl(request, db, DropTable(table_schema(row)))
        row.deleted = True
        save(row)
        return None
    if action == "copy-table":
        return dump(copy_table(request, row, db, db, row.name + "_copy"))
    if action == "operate-table-data":
        operate_rows(request, row, db, p.get("data"), p.get("execDev"))
        return None
    if action == "import-table-data":
        rows = import_xlsx(request.FILES.get("file"))
        operate_rows(
            request, row, db, [{"operateType": 1, "tableData": r} for r in rows], p.get("execDev")
        )
        return None
    schema = table_schema(row)
    if action == "table-template":
        headers = [f.name for f in DatabaseField.objects.filter(tb_id=row.pk) if not f.is_system]
        return export_xlsx([], headers, "template")
    if action == "export-table-data":
        ids = p.get("dataIds", [])
        if not isinstance(ids, list):
            raise ValidationError("导出记录标识必须为数组")
        statement = select(schema).order_by(schema.c.id)
        if ids:
            statement = statement.where(schema.c.id.in_([number(value) for value in ids]))
        rows = []
        offset = 0
        while True:
            batch = dml(request, db, statement.offset(offset).limit(1000), p.get("execDev"))
            if not isinstance(batch, list):
                raise clients.ResourceServiceError("数据库查询结果无效")
            rows.extend(data_row(item) for item in batch)
            if len(batch) < 1000:
                break
            offset += len(batch)
        return export_xlsx(rows, [c.name for c in schema.columns], "data")
    if action == "select-table-data":
        size = min(number(p.get("pageSize"), 10), 1000)
        page = number(p.get("pageNum"), 1)
        rows = dml(
            request,
            db,
            select(schema).order_by(schema.c.id).offset((page - 1) * size).limit(size),
            p.get("execDev"),
        )
        if not isinstance(rows, list):
            raise clients.ResourceServiceError("数据库查询结果无效")
        count = dml(
            request, db, select(func.count().label("count")).select_from(schema), p.get("execDev")
        )
        total = int(count[0]["count"]) if count else 0
        return {
            "records": [data_row(item) for item in rows],
            "total": total,
            "size": size,
            "current": page,
            "pages": (total + size - 1) // size,
        }
    raise Http404()


def copy_table(request, source, source_db, target_db, name):
    target = create_table(
        request,
        target_db,
        {
            "name": name,
            "description": source.description,
            "fields": [dump(f) for f in DatabaseField.objects.filter(tb_id=source.pk)],
        },
    )
    schema = table_schema(source)
    for env in (1, 2):
        offset = 0
        while True:
            rows = dml(
                request,
                source_db,
                select(schema).order_by(schema.c.id).offset(offset).limit(500),
                env,
            )
            if not rows:
                break
            operations = [
                {
                    "operateType": 1,
                    "tableData": {k: v for k, v in r.items() if k not in SYSTEM_FIELDS},
                }
                for r in rows
            ]
            operate_rows(request, target, target_db, operations, env)
            offset += len(rows)
    return target
