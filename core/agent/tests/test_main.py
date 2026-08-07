"""Tests for the agent service entry point configuration."""

import ast
from pathlib import Path


def test_initialize_extensions_does_not_register_unused_database_service() -> None:
    main_module = Path(__file__).resolve().parents[1] / "main.py"
    tree = ast.parse(main_module.read_text(encoding="utf-8"))
    init_function = next(
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name == "initialize_extensions"
    )
    service_assignment = next(
        node
        for node in init_function.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "need_init_services"
            for target in node.targets
        )
    )
    services = ast.literal_eval(service_assignment.value)

    assert "database_service" not in services
