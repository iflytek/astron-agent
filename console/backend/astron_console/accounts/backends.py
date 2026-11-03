from django.contrib.auth.backends import ModelBackend


class AccountBackend(ModelBackend):
    def user_can_authenticate(self, user):
        return user.account_enabled
