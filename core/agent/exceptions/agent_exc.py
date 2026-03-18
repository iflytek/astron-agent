"""Agent exception definitions."""

from agent.exceptions.codes import c_0, c_40500
from common.exceptions.base import BaseExc


class AgentExc(BaseExc):
    """Exception class for general agent errors."""


AgentNormalExc = AgentExc(*c_0)
AgentInternalExc = AgentExc(*c_40500)
