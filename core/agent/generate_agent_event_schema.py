import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agent.api.schemas.agent_event import agent_event_v1_json_schema


OUTPUT = (
    Path(__file__).resolve().parents[2]
    / "docs/contracts/agent-event-protocol-v1.schema.json"
)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(
            agent_event_v1_json_schema(),
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
