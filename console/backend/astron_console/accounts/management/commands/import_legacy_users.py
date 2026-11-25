import json
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from astron_console.accounts.models import User, UserProfile, normalize_username


class Command(BaseCommand):
    help = "Import existing user_info identities without changing UIDs, resources or passwords."

    def add_arguments(self, parser):
        parser.add_argument("--username-map", help="JSON object mapping existing UID to login name")

    def handle(self, *args, **options):
        aliases = {}
        if options["username_map"]:
            try:
                aliases = json.loads(Path(options["username_map"]).read_text())
                if not isinstance(aliases, dict):
                    raise ValueError
            except (OSError, ValueError) as exc:
                raise CommandError("username-map must be a readable JSON object") from exc
        imported = 0
        with transaction.atomic():
            profiles = list(UserProfile.objects.select_for_update().order_by("id"))
            existing = {user.pk: user for user in User.objects.all()}
            names = {normalize_username(user.username): user.pk for user in existing.values()}
            pending = []
            for profile in profiles:
                if not profile.uid:
                    raise CommandError(f"Profile id={profile.pk} has no UID; repair it explicitly")
                if profile.uid in existing:
                    continue
                name = aliases.get(profile.uid, profile.username)
                if not isinstance(name, str):
                    raise CommandError(f"UID {profile.uid} needs a username-map entry")
                name = normalize_username(name)
                user = User(
                    id=profile.uid,
                    username=name,
                    is_active=profile.account_status == 1 and profile.deleted == 0,
                )
                user.set_unusable_password()
                try:
                    user.full_clean(exclude=["password"], validate_unique=False)
                except ValidationError as exc:
                    raise CommandError(
                        f"UID {profile.uid} needs a valid username-map entry"
                    ) from exc
                if name in names:
                    raise CommandError(
                        f"Username conflict for UID {profile.uid}; supply username-map"
                    )
                names[name] = profile.uid
                pending.append(user)
            for user in pending:
                user.save(force_insert=True)
                imported += 1
        self.stdout.write(
            f"Imported {imported} accounts; existing credentials and resources unchanged."
        )
