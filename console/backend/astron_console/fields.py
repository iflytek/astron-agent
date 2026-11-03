from django.db import models


class StoredBooleanField(models.BooleanField):
    """MySQL BIT(1) and TINYINT(1) share one Python bool without rewriting stored rows."""

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        if isinstance(value, bytes):
            return bool(int.from_bytes(value, "big"))
        return bool(value)

    def get_prep_value(self, value):
        if isinstance(value, bytes):
            value = bool(int.from_bytes(value, "big"))
        return super().get_prep_value(value)
