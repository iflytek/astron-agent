from __future__ import annotations

import shlex
import unittest
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass(frozen=True)
class Directive:
    name: str
    arguments: tuple[str, ...]


@dataclass(frozen=True)
class Block:
    name: str
    arguments: tuple[str, ...]
    children: tuple["Directive | Block", ...]


def parse_nginx_config(config: str) -> Block:
    lexer = shlex.shlex(config, posix=True, punctuation_chars="{};")
    lexer.commenters = "#"
    lexer.whitespace_split = True
    tokens = iter(lexer)

    def parse_children(
        stop_at_closing_brace: bool = False,
    ) -> tuple[Directive | Block, ...]:
        children: list[Directive | Block] = []
        statement: list[str] = []
        for token in tokens:
            if token == "}":
                if not stop_at_closing_brace or statement:
                    raise ValueError("unexpected closing brace")
                return tuple(children)
            if token == ";":
                if not statement:
                    raise ValueError("empty directive")
                children.append(Directive(statement[0], tuple(statement[1:])))
                statement = []
                continue
            if token == "{":
                if not statement:
                    raise ValueError("block without a header")
                children.append(
                    Block(
                        statement[0],
                        tuple(statement[1:]),
                        parse_children(stop_at_closing_brace=True),
                    )
                )
                statement = []
                continue
            statement.append(token)

        if stop_at_closing_brace:
            raise ValueError("unclosed block")
        if statement:
            raise ValueError("directive without semicolon")
        return tuple(children)

    return Block("root", (), parse_children())


def find_exact_location(root: Block, path: str) -> Optional[Block]:
    for child in root.children:
        if not isinstance(child, Block):
            continue
        if child.name == "location" and child.arguments == ("=", path):
            return child
        match = find_exact_location(child, path)
        if match is not None:
            return match
    return None


def direct_directives(block: Block, name: str) -> list[tuple[str, ...]]:
    return [
        child.arguments
        for child in block.children
        if isinstance(child, Directive) and child.name == name
    ]


class NginxSseRoutesTest(unittest.TestCase):
    def test_workflow_chat_has_an_exact_long_lived_sse_route(self) -> None:
        config_path = Path(__file__).resolve().parents[1] / "nginx" / "nginx.conf"
        root = parse_nginx_config(config_path.read_text(encoding="utf-8"))

        location = find_exact_location(root, "/console-api/workflow/chat")
        self.assertIsNotNone(location, "missing exact workflow-chat SSE location")
        assert location is not None

        self.assertIn(
            ("http://console-hub:8080/workflow/chat",),
            direct_directives(location, "proxy_pass"),
        )
        self.assertIn(("1.1",), direct_directives(location, "proxy_http_version"))
        self.assertIn(
            ("Connection", ""), direct_directives(location, "proxy_set_header")
        )
        self.assertIn(("off",), direct_directives(location, "proxy_buffering"))
        self.assertIn(("off",), direct_directives(location, "proxy_cache"))
        self.assertIn(("1800s",), direct_directives(location, "proxy_read_timeout"))
        self.assertIn(("1800s",), direct_directives(location, "proxy_send_timeout"))
        self.assertIn(
            ("X-Accel-Buffering", "no"), direct_directives(location, "add_header")
        )


if __name__ == "__main__":
    unittest.main()
