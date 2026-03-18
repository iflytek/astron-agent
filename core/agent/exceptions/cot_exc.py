"""Chain-of-thought exception definitions."""

from agent.exceptions.codes import c_40022
from common.exceptions.base import BaseExc


class CotExc(BaseExc):
    """Exception class for chain-of-thought errors."""


CotFormatIncorrectExc = CotExc(*c_40022)
