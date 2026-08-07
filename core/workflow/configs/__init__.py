import os
from abc import ABC, abstractmethod
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger

from workflow.configs.app_config import WorkflowConfig
from workflow.consts.config_env import EnvStrategy


class EnvLoader(ABC):
    """
    Abstract base class for environment variable loaders.
    Defines the interface for loading environment variables.
    """

    @abstractmethod
    def load(self) -> None:
        pass


class LocalLoader(EnvLoader):
    """
    Load environment variables from local .env files.
    """

    def __init__(self) -> None:
        """
        Initialize the LocalLoader by determining the appropriate .env file
        based on the runtime environment.
        """
        self.env_file = Path(__file__).parent.parent / "config.env"
        logger.debug(f"config.env: {self.env_file}")

    def load(self) -> None:
        """
        Load environment variables from the selected .env file.
        :raises ValueError: If no configuration file is found
        """
        if os.path.exists(self.env_file):
            load_dotenv(self.env_file, override=False)
            logger.debug("Using config.env file.")
        else:
            raise ValueError("No config.env file found.")


class PolarisLoader(EnvLoader):
    """
    Load environment variables from Polaris configuration management system.
    """

    def __init__(self) -> None:
        """
        Initialize the PolarisLoader with necessary Polaris connection parameters
        """
        self.base_url = os.getenv("POLARIS_URL", "")
        self.username = os.getenv("POLARIS_USERNAME", "")
        self.password = os.getenv("POLARIS_PASSWORD", "")
        self.project_name = os.getenv("PROJECT_NAME", "hy-spark-agent-builder")
        self.cluster_group = os.getenv("POLARIS_CLUSTER", "")
        self.service_name = os.getenv("POLARIS_SERVICE_NAME", "spark-flow")
        self.version = os.getenv("POLARIS_VERSION", "1.0.0")
        self.config_file = os.getenv("POLARIS_CONFIG_FILE", "config.env")
        logger.info(
            f"🔍 Polaris config info: "
            f"project name = {self.project_name}, "
            f"cluster group = {self.cluster_group}, "
            f"service name = {self.service_name}, "
            f"version = {self.version}, "
            f"config file = {self.config_file}"
        )

    def load(self) -> None:
        """
        Load environment variables from Polaris.
        :raises ConnectionError: If unable to connect to Polaris
        :raises TimeoutError: If the request to Polaris times out
        :raises ValueError: If Polaris returns invalid data
        """
        from common.settings.polaris import ConfigFilter, Polaris

        config_filter = ConfigFilter(
            project_name=self.project_name,
            cluster_group=self.cluster_group,
            service_name=self.service_name,
            version=self.version,
            config_file=self.config_file,
        )
        polaris = Polaris(
            base_url=self.base_url, username=self.username, password=self.password
        )
        try:
            _ = polaris.pull(
                config_filter=config_filter,
                retry_count=3,
                retry_interval=5,
                set_env=True,
            )
            return
        except (ConnectionError, TimeoutError, ValueError) as e:
            raise ValueError(
                f"⚠️ Polaris configuration loading failed, "
                f"continuing with local configuration: {e}"
            )


class EnvLoaderFactory:
    """
    Factory class to create EnvLoader instances based on strategy.
    """

    @staticmethod
    def create(strategy: str) -> "EnvLoader":
        """
        Create an EnvLoader instance based on the given strategy.
        :param strategy: The environment loading strategy (e.g., 'local', 'polaris')
        :return: An instance of EnvLoader
        """
        if strategy == EnvStrategy.Local.value:
            logger.info("🔍 Using Local file for configuration management.")
            return LocalLoader()
        if strategy == EnvStrategy.Polaris.value:
            logger.info("🔍 Using Polaris for configuration management.")
            return PolarisLoader()
        raise ValueError(f"Unknown strategy: {strategy}")


def set_env() -> None:
    """
    Set environment variables by loading configuration from environment files.

    This function determines the appropriate configuration file based on the
    runtime environment (local vs production) and loads the environment
    variables from the corresponding .env file.

    :raises ValueError: If no configuration file is found
    :raises Exception: Re-raises any other exceptions that occur during loading
    """
    strategy = os.getenv("CONFIG_TYPE", EnvStrategy.Local.value)
    loader = EnvLoaderFactory.create(strategy)
    loader.load()


set_env()
workflow_config = WorkflowConfig()
