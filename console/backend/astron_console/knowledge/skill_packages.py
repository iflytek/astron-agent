"""Resolve the same authorized Skill package for import and execution."""

from collections import defaultdict
from pathlib import PurePosixPath

from django.core.exceptions import ValidationError

from .common import filename

SKILL_ENTRY_NAME = "SKILL.md"
MAX_SKILL_FILE_BYTES = 5 * 1024 * 1024
MAX_SKILL_RESOURCES = 100
MAX_SKILL_RESOURCE_BYTES = 20 * 1024 * 1024


def is_skill_entry(row):
    return row.name == SKILL_ENTRY_NAME and row.entry_type == "file"


def validate_skill_file_size(size):
    if size < 0 or size > MAX_SKILL_FILE_BYTES:
        raise ValidationError("Skill单个文件不能超过5MB")


class SkillPackages:
    def __init__(self, entries):
        self.children = defaultdict(list)
        self.roots = defaultdict(list)
        for row in entries:
            self.children[row.parent_id].append(row)
            if row.parent_id and is_skill_entry(row):
                self.roots[row.parent_id].append(row.pk)

    def resources(self, entry):
        # A root-level entry has no sibling attachments. Descendant packages own
        # their complete subtrees, regardless of which packages were selected.
        if not entry.parent_id:
            return []
        return sorted(
            (
                (path, row)
                for path, row in self._attachments(entry.parent_id, strict=True)
                if row.pk != entry.pk
            ),
            key=lambda item: item[0],
        )

    def _attachments(self, root, *, strict):
        pending = [(root, "")]
        visited = set()
        while pending:
            parent_id, prefix = pending.pop()
            if parent_id in visited:
                if strict:
                    raise ValidationError("Skill目录关系无效")
                continue
            visited.add(parent_id)
            for row in self.children[parent_id]:
                if strict and row.name != filename(row.name):
                    raise ValidationError("Skill文件名无效")
                path = prefix + (row.name or "")
                if row.entry_type == "folder" and row.pk not in self.roots:
                    pending.append((row.pk, path + "/"))
                elif row.entry_type == "file" and row.object_key:
                    yield path, row

    def attachment_usage(self):
        usage = {}
        for root, skill_ids in self.roots.items():
            sizes = [
                max(0, row.file_size or 0)
                for _, row in self._attachments(root, strict=False)
                if row.pk not in skill_ids
            ]
            totals = (len(sizes), sum(sizes))
            for skill_id in skill_ids:
                usage[skill_id] = totals
        return usage


def validate_attachment_limits(count, size, previous=(0, 0)):
    if count > MAX_SKILL_RESOURCES and count > previous[0]:
        raise ValidationError("Skill附件不能超过100个")
    if size > MAX_SKILL_RESOURCE_BYTES and size > previous[1]:
        raise ValidationError("Skill附件总大小不能超过20MB")


def validate_skill_package(entry, resources):
    if not is_skill_entry(entry) or not entry.object_key:
        raise ValidationError("Skill必须引用有效的SKILL.md")
    validate_skill_file_size(entry.file_size or 0)
    total_size = 0
    paths = {SKILL_ENTRY_NAME}
    for path, row in resources:
        if path in paths:
            raise ValidationError("Skill目录存在重名文件")
        paths.add(path)
        size = row.file_size or 0
        validate_skill_file_size(size)
        total_size += size
    if any(str(parent) in paths for path in paths for parent in PurePosixPath(path).parents):
        raise ValidationError("Skill路径被文件占用")
    validate_attachment_limits(len(resources), total_size)
