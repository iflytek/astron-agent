"""Fail when the package, server.json and (optionally) the release tag disagree."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    init = (ROOT / "src" / "astron_agent_mcp" / "__init__.py").read_text(encoding="utf-8")
    match = re.search(r'^__version__ = "([^"]+)"', init, re.MULTILINE)
    if not match:
        print("__version__ not found in src/astron_agent_mcp/__init__.py")
        return 1
    versions = {"__version__": match.group(1)}

    server = json.loads((ROOT / "server.json").read_text(encoding="utf-8"))
    versions["server.json version"] = server["version"]
    for package in server["packages"]:
        versions[f"server.json {package['identifier']}"] = package["version"]
    if len(sys.argv) > 1:
        versions["release tag"] = sys.argv[1]

    for name, value in versions.items():
        print(f"{name}: {value}")
    if len(set(versions.values())) != 1:
        print("error: versions do not match")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
