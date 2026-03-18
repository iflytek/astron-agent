from agent.exceptions.codes import c_40022
from common.exceptions.base import BaseExc


class CotExc(BaseExc):
    pass


CotFormatIncorrectExc = CotExc(*c_40022)
