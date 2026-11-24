from django.core.management.base import BaseCommand, CommandError

from astron_console.publishing.legacy import adopt_legacy


class Command(BaseCommand):
    help = (
        "Non-destructively adopt authoritative legacy release versions; report unresolved sources."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--allow-unresolved",
            action="store_true",
            help="Start with valid releases; persist and visibly warn about unresolved sources.",
        )

    def handle(self, *args, **options):
        counts = adopt_legacy()
        self.stdout.write(
            f"Imported={counts['imported']} existing={counts['existing']} "
            f"unresolved={counts['unresolved']}"
        )
        if counts["unresolved"] and options["allow_unresolved"]:
            self.stderr.write(
                self.style.WARNING(
                    "WARNING: unresolved legacy releases remain unavailable. Review the publishing "
                    "issues and rerun adopt_legacy_publications without --allow-unresolved "
                    "before accepting the upgrade."
                )
            )
        elif counts["unresolved"]:
            raise CommandError(
                "Some legacy releases require review in publishing management; "
                "original records remain unchanged."
            )
