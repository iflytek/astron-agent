from django.core.management.base import BaseCommand, CommandError

from astron_console.knowledge.clients import ResourceServiceError
from astron_console.knowledge.storage import initialize_buckets


class Command(BaseCommand):
    help = (
        "Create missing resource buckets as private buckets, preserving existing objects/policies"
    )

    def handle(self, *args, **options):
        try:
            created = initialize_buckets()
        except ResourceServiceError as exc:
            raise CommandError(str(exc)) from None
        self.stdout.write(
            self.style.SUCCESS("Resource storage ready; created: " + (", ".join(created) or "none"))
        )
