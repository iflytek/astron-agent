"""
AI Tools service main entry module
"""

import functools

from plugin.aitools.app.aitools_server import AIToolsServer

print = functools.partial(print, flush=True)  # pylint: disable=redefined-builtin


def main() -> None:
    """Main function"""
    print("🌟 AITools Development Environment Launcher")
    print("=" * 50)
    print("\n🚀 Starting AITools service...")

    try:
        AIToolsServer().start_uvicorn()
    except KeyboardInterrupt:
        print("\n🛑 Service stopped")
        raise SystemExit(0) from None
    except Exception as e:
        print(f"\n❌ Service failed to start: {e}")
        raise SystemExit(1) from e


if __name__ == "__main__":
    main()
