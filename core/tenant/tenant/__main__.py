"""Run Tenant with the Compose, Helm, or local TOML configuration."""

import argparse
import logging
from pathlib import Path

import uvicorn

from .api import create_app_server
from .config import ConfigError, Settings


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config", "-config", type=Path, default=Path("config/config.toml")
    )
    args = parser.parse_args()
    config_path = args.config
    if config_path == parser.get_default("config") and not config_path.exists():
        config_path = Path("config.toml")
    try:
        settings = Settings.load(config_path)
        settings.log_path.parent.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(message)s",
            handlers=[logging.StreamHandler(), logging.FileHandler(settings.log_path)],
        )
    except (OSError, ConfigError, ValueError) as error:
        parser.exit(
            1,
            f"Tenant configuration failed: {error if isinstance(error, ConfigError) else 'invalid configuration or log path'}\n",
        )
    # The key lookup URL contains a credential, so omit access URLs from logs.
    uvicorn.run(
        create_app_server(settings),
        host="0.0.0.0",
        port=settings.port,
        access_log=False,
    )


if __name__ == "__main__":
    main()
