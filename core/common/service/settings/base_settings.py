import abc
from typing import Any, Type

from pydantic_settings import BaseSettings, PydanticBaseSettingsSource

from common.service.base import Service, ServiceType

# from common.settings.settings import ProjectSettings


class BaseSettingsService(Service):

    name = ServiceType.SETTINGS_SERVICE

    @property
    @abc.abstractmethod
    def setting_base(self) -> BaseSettings:
        raise NotImplementedError


class BaseRemoteSettings(PydanticBaseSettingsSource):

    def __init__(
        self,
        settings_cls: type[BaseSettings],
        dotenv_settings: PydanticBaseSettingsSource,
        cls: Type["BaseSettings"],
    ):
        super().__init__(settings_cls)
        self.dotenv_settings = dotenv_settings()

    @abc.abstractmethod
    def __call__(self) -> dict[str, Any]:
        raise NotImplementedError
