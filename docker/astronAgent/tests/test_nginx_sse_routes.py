from __future__ import annotations

import shlex
import unittest
from dataclasses import dataclass
from pathlib import Path


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


def direct_blocks(block: Block, name: str) -> list[Block]:
    return [
        child
        for child in block.children
        if isinstance(child, Block) and child.name == name
    ]


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

        http_blocks = direct_blocks(root, "http")
        self.assertEqual(len(http_blocks), 1, "expected one top-level http block")
        servers = [
            server
            for server in direct_blocks(http_blocks[0], "server")
            if ("80",) in direct_directives(server, "listen")
            and ("localhost",) in direct_directives(server, "server_name")
        ]
        self.assertEqual(len(servers), 1, "expected one localhost:80 server")

        locations = [
            (index, child)
            for index, child in enumerate(servers[0].children)
            if isinstance(child, Block) and child.name == "location"
        ]
        exact_locations = [
            entry
            for entry in locations
            if entry[1].arguments == ("=", "/console-api/workflow/chat")
        ]
        generic_locations = [
            entry for entry in locations if entry[1].arguments == ("/console-api/",)
        ]
        self.assertEqual(
            len(exact_locations), 1, "missing direct exact workflow-chat SSE location"
        )
        self.assertEqual(
            len(generic_locations), 1, "missing direct generic console-api location"
        )
        exact_index, location = exact_locations[0]
        generic_index, _ = generic_locations[0]
        self.assertLess(
            exact_index,
            generic_index,
            "workflow-chat SSE location must precede the generic console-api route",
        )

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
