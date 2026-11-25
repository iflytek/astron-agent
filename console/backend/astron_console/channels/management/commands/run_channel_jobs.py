import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from astron_console.channels.jobs import claim, perform, poll_training, reap_abandoned


class Command(BaseCommand):
    help = "Process durable WeChat messages and poll submitted voice training tasks"

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true")

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            reap_abandoned()
            row = claim()
            if row:
                perform(row)
            poll_training()
            if options["once"]:
                return
            if row is None:
                time.sleep(1)
