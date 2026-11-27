#!/usr/bin/env python3
"""Exercise the complete Compose gateway config with a real isolated Nginx binary.

Run with --nginx-bin /path/to/nginx when Nginx is not on PATH. No containers,
application data, credentials, or production services are used.
"""

import argparse
import http.client
import json
import shutil
import socket
import subprocess
import tempfile
import threading
import time
from contextlib import ExitStack
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def mock_upstream(name):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.respond()

        def do_POST(self):
            self.respond()

        def respond(self):
            if self.path == "/internal/gateway/auth/workflow":
                self.send_response(204)
                self.end_headers()
                return
            body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
            response = json.dumps(
                {
                    "upstream": name,
                    "path": self.path,
                    "method": self.command,
                    "headers": dict(self.headers),
                    "body": body.decode(),
                }
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            if name == "backend":
                self.send_header("Cache-Control", "private, no-store")
                self.send_header("Set-Cookie", "sessionid=response-session; HttpOnly; Path=/")
            self.end_headers()
            self.wfile.write(response)

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def exercise(binary, config):
    with ExitStack() as stack:
        backend = mock_upstream("backend")
        frontend = mock_upstream("frontend")
        for server in (backend, frontend):
            stack.callback(server.server_close)
            stack.callback(server.shutdown)
        temporary = Path(
            stack.enter_context(tempfile.TemporaryDirectory(prefix="astron-nginx-routes-"))
        )
        (temporary / "logs").mkdir()
        (temporary / "mime.types").write_text("types { text/plain txt; }\n")
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            gateway_port = listener.getsockname()[1]
        # Only adapt runtime addresses/paths. All shipped locations and directives
        # remain intact, so actual Nginx selects routes and validates syntax.
        source = config.read_text()
        source = source.replace("worker_processes auto;", "worker_processes 1;")
        source = source.replace("worker_rlimit_nofile 65535;", "")
        source = source.replace("/etc/nginx/mime.types", str(temporary / "mime.types"))
        source = source.replace("/var/log/nginx/", str(temporary / "logs") + "/")
        source = source.replace("listen 80;", f"listen 127.0.0.1:{gateway_port};")
        source = source.replace(
            "http://console-hub:8080", f"http://127.0.0.1:{backend.server_port}"
        )
        source = source.replace(
            "http://console-frontend:1881", f"http://127.0.0.1:{frontend.server_port}"
        )
        target = temporary / "nginx.conf"
        target.write_text(source)
        args = [binary, "-p", str(temporary) + "/", "-c", str(target)]
        subprocess.run([*args, "-t"], check=True, capture_output=True, text=True)
        process = subprocess.Popen(
            [*args, "-g", "daemon off;"], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE
        )
        try:
            for _ in range(100):
                if process.poll() is not None:
                    raise RuntimeError(process.stderr.read().decode())
                try:
                    with socket.create_connection(("127.0.0.1", gateway_port), timeout=0.1):
                        break
                except OSError:
                    time.sleep(0.02)
            else:
                raise RuntimeError("Nginx did not start")

            def request(path, method="GET", body=None):
                connection = http.client.HTTPConnection("127.0.0.1", gateway_port, timeout=3)
                try:
                    connection.request(
                        method,
                        path,
                        body=body,
                        headers={
                            "Host": "catalog.example:8088",
                            "Cookie": "sessionid=request-session; csrftoken=request-csrf",
                            "X-CSRFToken": "request-csrf",
                            "Content-Type": "application/json",
                        },
                    )
                    response = connection.getresponse()
                    status, headers, content = (
                        response.status,
                        response.getheaders(),
                        response.read(),
                    )
                    return status, headers, content
                finally:
                    connection.close()

            def routed(path, upstream, upstream_path=None, method="GET", body=None):
                status, headers, content = request(path, method, body)
                assert status == 200, (path, status)
                data = json.loads(content)
                assert data["upstream"] == upstream, (path, data["upstream"])
                assert data["path"] == (upstream_path or path), (path, data["path"])
                return headers, data

            checked = 0
            for extension in (
                "png",
                "jpg",
                "jpeg",
                "gif",
                "ico",
                "svg",
                "SVG",
                "js",
                "css",
                "woff2",
                "ttf",
            ):
                path = f"/console-api/image/content/user-test/object/avatar.{extension}?download=1"
                headers, data = routed(path, "backend", path.removeprefix("/console-api"))
                forwarded = {key.lower(): value for key, value in data["headers"].items()}
                assert forwarded["host"] == "catalog.example:8088"
                assert forwarded["cookie"] == "sessionid=request-session; csrftoken=request-csrf"
                assert forwarded["x-csrftoken"] == "request-csrf"
                assert forwarded["x-real-ip"] == "127.0.0.1"
                assert forwarded["x-forwarded-for"] == "127.0.0.1"
                assert forwarded["x-forwarded-proto"] == "http"
                assert ("Set-Cookie", "sessionid=response-session; HttpOnly; Path=/") in headers
                assert not any(
                    "public" in value or "immutable" in value
                    for key, value in headers
                    if key.lower() == "cache-control"
                )
                checked += 1
            _, upload = routed(
                "/console-api/image/upload", "backend", "/image/upload", "POST", '{"avatar":"test"}'
            )
            assert upload["body"] == '{"avatar":"test"}'
            checked += 1
            for path in (
                "/assets/avatar.png",
                "/assets/app.js",
                "/assets/style.css",
                "/assets/font.woff2",
            ):
                headers, _ = routed(path, "frontend")
                assert any(
                    "public, immutable" in value
                    for key, value in headers
                    if key.lower() == "cache-control"
                )
                checked += 1
            for path in ("/console-api/agents", "/console-api/workflow"):
                routed(path, "backend", path.removeprefix("/console-api"))
                checked += 1
            for path in (
                "/console-api/agents/42/runs/events.png",
                "/console-api/published/42/chat.png",
                "/console-api/workflow/42/debug.png",
            ):
                headers, _ = routed(path, "backend", path.removeprefix("/console-api"))
                assert ("X-Accel-Buffering", "no") in headers
                checked += 1
            for path in (
                "/console-api/agents/internal/resolve",
                "/console-api/agents/internal/runs/run-id/steering",
                "/console-api/agents/artifacts/internal-upload",
                "/console-api/workflow/internal/resolve",
                "/console-api/internal/gateway/auth/workflow",
                "/console-api/workflow/artifacts/internal-upload",
                "/console-api/workflow/artifacts/console-upload",
                "/console-api/skill-sandbox/internal-runtime-config",
                "/agent/v1/internal",
                "/workflow/v1/internal",
            ):
                for suffix in ("", "/blocked.png"):
                    assert request(path + suffix)[0] == 404, path + suffix
                    checked += 1
            assert request("/_gateway_auth/workflow")[0] == 404
            checked += 1
            for path in (
                "/agent/v1/chat/completions",
                "/workflow/v1/chat/completions",
                "/workflow/v1/resume",
                "/workflow/v1/stop",
            ):
                routed(path, "backend")
                checked += 1
            print(f"Nginx config syntax and {checked} HTTP routing checks passed")
        finally:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
            process.stderr.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--nginx-bin", default=shutil.which("nginx"))
    parser.add_argument(
        "--config", type=Path, default=Path(__file__).resolve().parents[1] / "nginx/nginx.conf"
    )
    args = parser.parse_args()
    if not args.nginx_bin:
        parser.error("Nginx is required; provide --nginx-bin /path/to/nginx")
    exercise(args.nginx_bin, args.config)


if __name__ == "__main__":
    main()
