import json

from workflow.engine.nodes.pgsql.pgsql_client import PGSqlClient, PGSqlConfig
from workflow.engine.nodes.pgsql.pgsql_node import PGSqlNode


def test_custom_sql_placeholders_are_converted_to_bind_params() -> None:
    node = PGSqlNode.model_construct()

    sql, params = node.build_parameterized_sql(
        "SELECT * FROM users WHERE name = '{{name}}' AND note = {{note}}",
        {"name": "x' OR '1'='1", "note": "safe"},
    )

    assert sql == "SELECT * FROM users WHERE name = :input_0 AND note = :input_1"
    assert params == {"input_0": "x' OR '1'='1", "input_1": "safe"}


def test_pgsql_client_payload_includes_bind_params() -> None:
    config = PGSqlConfig(
        appId="app",
        apiKey="key",
        database_id=1,
        uid="u1",
        spaceId="",
        dml="SELECT * FROM users WHERE name = :input_0",
        params={"input_0": "x' OR '1'='1"},
    )

    payload = PGSqlClient(config=config).payload()

    assert json.loads(json.dumps(payload))["params"] == {"input_0": "x' OR '1'='1"}
