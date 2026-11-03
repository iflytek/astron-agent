"""Authenticated presentation configuration needed by resource management."""

from django.core.exceptions import PermissionDenied

from astron_console.http import api_endpoint

from .common import serialize, text
from .models import ConfigInfo

# ConfigInfo also holds platform credentials and model private keys. Never expose
# arbitrary categories through this endpoint, including to an administrator.
SAFE_CATEGORIES = frozenset(
    {
        "ICON",
        "COLOR",
        "DB_TABLE_TEMPLATE",
        "DB_TABLE_RESERVED_KEYWORD",
        "MODEL_DEFAULT_CONFIGS",
        "SELF_MODEL_COMMON_CONFIG",
        "DEFAULT_SLICE_RULES_CBG",
        "CUSTOM_SLICE_RULES_CBG",
        "CUSTOM_SLICE_SEPERATORS_CBG",
        "DEFAULT_SLICE_RULES_AIUI",
        "CUSTOM_SLICE_RULES_AIUI",
        "CUSTOM_SLICE_SEPERATORS_AIUI",
        "DEFAULT_SLICE_RULES_SPARK",
        "CUSTOM_SLICE_RULES_SPARK",
        "CUSTOM_SLICE_SEPERATORS_SPARK",
    }
)


@api_endpoint(["GET"])
def configs(request, single=False):
    category = text(request.GET, "category", required=True, limit=64)
    if category not in SAFE_CATEGORIES:
        raise PermissionDenied
    query = ConfigInfo.objects.filter(category=category, is_valid=1).order_by("id")
    if single:
        code = text(request.GET, "code", required=True, limit=128)
        item = query.filter(code=code).first()
        return serialize(item) if item else None
    # The list contract is category-wide. Existing clients append code=1 even
    # when requesting all ICON groups; applying that parameter would hide them.
    return [serialize(item) for item in query]
