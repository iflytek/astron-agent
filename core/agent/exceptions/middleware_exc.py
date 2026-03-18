from agent.exceptions.codes import c_40040, c_40041
from common.exceptions.base import BaseExc


class MiddlewareExc(BaseExc):
    pass


AppAuthFailedExc = MiddlewareExc(*c_40040)

PingRedisExc = MiddlewareExc(*c_40041)
