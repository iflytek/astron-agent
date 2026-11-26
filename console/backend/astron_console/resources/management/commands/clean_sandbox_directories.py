"""Retry directory cleanup independently of HTTP requests and active workflow runs."""

import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from astron_console.resources.local_sandbox import purge_deleted_resources


class Command(BaseCommand):
    help = "Clean up local sandbox directories for deleted Agents and workflows"

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            purge_deleted_resources()
            time.sleep(5)
