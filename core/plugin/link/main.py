"""
Spark Link Server Main Entry Point

This module serves as the main entry point for the Link server application.
It initializes the necessary environment variables
and starts the SparkLinkServer instance.
"""

import functools
import os
import subprocess
import sys
from pathlib import Path

print = functools.partial(print, flush=True)  # pylint: disable=redefined-builtin


def setup_python_path() -> None:
    """Set up Python path to include root, parent dir, and grandparent dir"""
    # Retrieve the path of the current script and the root directory.
    current_file_path = Path(__file__)
    project_root = current_file_path.parent  # Project root directory
    parent_dir = project_root.parent  # Parent directory
    grandparent_dir = parent_dir.parent

    # Retrieve the current PYTHONPATH
    python_path = os.environ.get("PYTHONPATH", "")

    # Check and add the necessary directories.
    new_paths = []
    for directory in [project_root, parent_dir, grandparent_dir]:
        if Path(directory).exists() and str(directory) not in python_path:
            new_paths.append(str(directory))

    # If there is a path that needs to be added, update the PYTHONPATH.
    if new_paths:
        new_paths_str = os.pathsep.join(new_paths)
        if python_path:
            os.environ["PYTHONPATH"] = (
                f"{new_paths_str} \
                {os.pathsep}{python_path}"
            )
        else:
            os.environ["PYTHONPATH"] = new_paths_str
        print(f"🔧 PYTHONPATH: {os.environ['PYTHONPATH']}")


def load_env_file(env_file: str) -> None:
    """Load environment variables from .env file"""
    if not os.path.exists(env_file):
        print(f"❌ Configuration file {env_file} does not exist")
        return

    print(f"📋 Loading configuration file: {env_file}")

    os.environ["CONFIG_ENV_PATH"] = env_file
    with open(env_file, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue

            # Parse environment variables
            if "=" in line:
                key, value = line.split("=", 1)
                # Set CONFIG_ENV_PATH, common to load
                if os.environ.get(key.strip()):
                    print(f"ENV  ✅ {key.strip()}={os.environ.get(key.strip())}")
                else:
                    print(f"CFG  ✅ {key.strip()}={value.strip()}")

            else:
                print(f"  ⚠️  Line {line_num} format error: {line}")


def start_service() -> None:
    """Start FastAPI service"""
    print("\n🚀 Starting Link service...")

    try:
        # Start FastAPI application
        relative_path = (Path(__file__).resolve().parent).relative_to(
            Path.cwd()
        ) / "app/start_server.py"
        if not relative_path.exists():
            raise FileNotFoundError(f"can not find {relative_path}")
        subprocess.run([sys.executable, relative_path], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Service startup failed: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Service stopped")
        sys.exit(0)


def main() -> None:
    """Main function"""
    print("🌟 Link Development Environment Launcher")
    print("=" * 50)

    # Set up Python path
    setup_python_path()

    # Load environment configuration
    config_file = Path(__file__).parent / "config.env"
    load_env_file(str(config_file))

    # Start service
    start_service()


if __name__ == "__main__":
    main()
