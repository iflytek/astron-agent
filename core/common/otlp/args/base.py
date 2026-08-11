from pydantic import BaseModel, Field


class BaseOtlpArgs(BaseModel):

    inited: bool = Field(default=False)
    otlp_endpoint: str = Field(default="")
    otlp_service_name: str = Field(default="")
    otlp_dc: str = Field(default="")
    otlp_protocol: str = Field(default="grpc")
    otlp_headers: str = Field(default="")
