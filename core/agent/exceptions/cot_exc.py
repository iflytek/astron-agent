from common.exceptions.base import BaseExc

from agent.exceptions.codes import c_40022


class CotExc(BaseExc):
    pass


CotFormatIncorrectExc = CotExc(*c_40022)
