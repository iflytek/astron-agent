# Use unified common package import module
from agent.exceptions.codes import c_0, c_40500
from common.exceptions.base import BaseExc


class AgentExc(BaseExc):
    pass


AgentNormalExc = AgentExc(*c_0)
AgentInternalExc = AgentExc(*c_40500)
