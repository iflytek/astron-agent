from django.contrib.auth.forms import UserCreationForm

from .models import User, normalize_username


class RegistrationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username",)

    def clean_username(self):
        self.cleaned_data["username"] = normalize_username(self.cleaned_data["username"])
        return super().clean_username()
