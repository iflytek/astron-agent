import unicodedata
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


def new_uid():
    return str(uuid.uuid4())


def normalize_username(value):
    return unicodedata.normalize("NFKC", value.strip()).casefold()


class User(AbstractUser):
    id = models.CharField(primary_key=True, max_length=128, default=new_uid, editable=False)

    class Meta:
        db_table = "console_auth_user"

    @property
    def account_enabled(self):
        return (
            self.is_active
            and UserProfile.objects.filter(uid=self.pk, account_status=1, deleted=0).exists()
        )


class UserProfile(models.Model):
    uid = models.CharField(max_length=128, unique=True, null=True)
    username = models.CharField(max_length=255, null=True)
    avatar = models.CharField(max_length=512, null=True, blank=True, default="")
    nickname = models.CharField(max_length=255, null=True, blank=True, default="")
    mobile = models.CharField(max_length=255, null=True, blank=True, default="")
    account_status = models.SmallIntegerField(default=1, null=True)
    enterprise_service_type = models.IntegerField(default=0, null=True)
    user_agreement = models.SmallIntegerField(default=0, null=True)
    deleted = models.SmallIntegerField(default=0, null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "user_info"
