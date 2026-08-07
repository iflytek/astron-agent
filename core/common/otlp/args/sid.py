from pydantic import Field

from common.otlp.args.base import BaseOtlpArgs
from common.otlp.ip import local_ip


class OtlpSidArgs(BaseOtlpArgs):
    sid_sub: str = Field(default="svc")
    sid_location: str = Field(default="")
    sid_ip: str = Field(default=local_ip)
    sid_local_port: str = Field(default="")
