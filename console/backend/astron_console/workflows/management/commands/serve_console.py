"""Supervise the web server and durable scheduler as one container lifecycle."""

import os
import signal
import subprocess
import sys
import time

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Run Console ASGI workers and workflow automation worker"

    def handle(self, *args, **options):
        children = []
        stopping = False

        def stop(signum, frame):
            nonlocal stopping
            stopping = True
            for child in children:
                if child.poll() is None:
                    child.terminate()

        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        try:
            children.append(
                subprocess.Popen(
                    [
                        sys.executable,
                        "manage.py",
                        "run_workflow_automation",
                    ]
                )
            )
            children.append(
                subprocess.Popen(
                    [
                        sys.executable,
                        "-m",
                        "uvicorn",
                        "astron_console.asgi:application",
                        "--host",
                        "0.0.0.0",
                        "--port",
                        "8080",
                        "--workers",
                        os.environ.get("CONSOLE_WORKERS", "2"),
                        "--no-proxy-headers",
                        "--no-access-log",
                    ]
                )
            )
            while not stopping and all(child.poll() is None for child in children):
                time.sleep(0.5)
            if not stopping:
                raise CommandError("Console web server or automation worker exited")
        finally:
            stop(None, None)
            for child in children:
                try:
                    child.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()
