import json
import os

import pytest

os.environ["RUNTIME_DATABASE_URL"] = (
    "sqlite:///file:runtime_tests?mode=memory&cache=shared&uri=true"
)
os.environ["RUNTIME_GATEWAY_IDENTITY_SECRET"] = "g" * 32
os.environ["RUNTIME_INTERNAL_API_KEY"] = "i" * 32
os.environ["RUNTIME_WORKFLOW_INTERNAL_API_KEY"] = "w" * 32
os.environ["RUNTIME_DELEGATION_ISSUERS_JSON"] = json.dumps(
    {
        "test-issuer": {
            "algorithms": ["HS256"],
            "keys": {"test-key": "delegation-test-secret-32-bytes!!"},
        }
    }
)

from agent_runtime.db.models import Base  # noqa: E402
from agent_runtime.db.session import engine  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database() -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
