"""Run the durable automation worker independently from ASGI web workers."""

import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from astron_console.workflows.automation import (
    claim_due,
    claim_pending,
    execute_claim,
    reap_abandoned,
)


class Command(BaseCommand):
    help = "Execute due workflow automations using durable database claims"

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true")

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            reap_abandoned()
            claim_due()
            record_id = claim_pending()
            if record_id:
                execute_claim(record_id)
            if options["once"]:
                return
            if not record_id:
                time.sleep(1)
