"""Plugin exception definitions."""

from typing import Any, NoReturn

from agent.exceptions.codes import (
    c_40023,
    c_40024,
    c_40025,
    c_40026,
    c_40027,
    c_40028,
    c_40029,
)
from agent.exceptions.llm_codes import ify_code_convert
from common.exceptions.base import BaseExc


class PluginExc(BaseExc):
    """Exception class for plugin-related errors."""


GetToolSchemaExc = PluginExc(*c_40023)
RunToolExc = PluginExc(*c_40024)
KnowledgeQueryExc = PluginExc(*c_40025)
GetMcpPluginExc = PluginExc(*c_40026)
RunMcpPluginExc = PluginExc(*c_40027)
RunWorkflowExc = PluginExc(*c_40028)
CallLlmPluginExc = PluginExc(*c_40029)


def llm_plugin_error(code: Any, message: str) -> NoReturn:
    """Convert an LLM error code and raise a PluginExc."""
    c, m = ify_code_convert(code)
    raise PluginExc(c, m, om=message)
