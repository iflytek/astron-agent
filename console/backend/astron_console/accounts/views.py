import logging

from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.views.decorators.http import require_GET, require_POST

from .forms import RegistrationForm
from .http import endpoint, form_error, response
from .models import User, UserProfile, normalize_username

logger = logging.getLogger(__name__)


def valid_password_fields(payload, *fields):
    return all(
        isinstance(payload.get(field), str) and 0 < len(payload[field]) <= 1024 for field in fields
    )


def profile_data(user):
    profile = UserProfile.objects.get(uid=user.pk)
    return {
        "id": profile.pk,
        "uid": user.pk,
        "username": user.username,
        "nickname": profile.nickname or user.username,
        "avatar": profile.avatar or "",
        "mobile": profile.mobile or "",
        "accountStatus": profile.account_status,
        "enterpriseServiceType": profile.enterprise_service_type,
        "userAgreement": profile.user_agreement,
        "createTime": profile.create_time,
        "updateTime": profile.update_time,
        "deleted": profile.deleted,
    }


def csrf_failure(request, reason=""):
    return response(message="请求校验失败，请刷新页面后重试", status=403)


@require_GET
def csrf_token(request):
    return response({"csrfToken": get_token(request)})


@require_POST
@endpoint(limit=10)
def register(request):
    if UserProfile.objects.exclude(uid__in=User.objects.values("id")).exists():
        return response(message="账号初始化尚未完成，请联系管理员", status=503)
    payload = request.payload
    if set(payload) - {"username", "password", "passwordConfirm"}:
        return response(message="注册仅接受用户名和密码", status=400)
    if not isinstance(payload.get("username"), str):
        return response(message="请输入用户名", status=400)
    if not valid_password_fields(payload, "password", "passwordConfirm"):
        return response(message="密码格式不正确", status=400)
    form = RegistrationForm(
        {
            "username": normalize_username(payload["username"]),
            "password1": payload.get("password"),
            "password2": payload.get("passwordConfirm"),
        }
    )
    if not form.is_valid():
        return form_error(form)
    try:
        with transaction.atomic():
            user = form.save()
            UserProfile.objects.create(uid=user.pk, username=user.username, nickname=user.username)
    except IntegrityError:
        return response(message="用户名已存在", status=400)
    login(request, user, backend="astron_console.accounts.backends.AccountBackend")
    logger.info("Account registered uid=%s", user.pk)
    return response(profile_data(user), status=201)


@require_POST
@endpoint(limit=30)
def login_view(request):
    username = request.payload.get("username")
    password = request.payload.get("password")
    if not isinstance(username, str) or not isinstance(password, str) or len(password) > 1024:
        return response(message="用户名或密码错误", status=400)
    user = authenticate(request, username=normalize_username(username), password=password)
    if user is None:
        logger.info("Account login rejected")
        return response(message="用户名或密码错误，或账号不可用", status=401)
    login(request, user)
    logger.info("Account login uid=%s", user.pk)
    return response(profile_data(user))


@require_POST
@endpoint()
def logout_view(request):
    logout(request)
    return response()


@require_GET
@endpoint(authenticated=True)
def me(request):
    return response(profile_data(request.user))


@require_POST
@endpoint(authenticated=True)
def update_profile(request):
    if set(request.payload) - {"nickname", "avatar"}:
        return response(message="只能更新昵称和头像", status=400)
    changes = {}
    for key, length in (("nickname", 255), ("avatar", 512)):
        if key in request.payload:
            value = request.payload[key]
            if not isinstance(value, str) or len(value) > length:
                return response(message="资料格式不正确", status=400)
            changes[key] = value.strip()
    if changes.get("avatar"):
        try:
            URLValidator(schemes=["https", "http"])(changes["avatar"])
        except ValidationError:
            return response(message="头像必须为 HTTP(S) 地址", status=400)
    UserProfile.objects.filter(uid=request.user.pk).update(**changes, update_time=timezone.now())
    return response(profile_data(request.user))


@require_POST
@endpoint(authenticated=True)
def agreement(request):
    UserProfile.objects.filter(uid=request.user.pk).update(
        user_agreement=1, update_time=timezone.now()
    )
    return response(True)


@require_POST
@endpoint(limit=10)
def reset_password(request):
    payload = request.payload
    if not valid_password_fields(payload, "password", "passwordConfirm"):
        return response(message="密码格式不正确", status=400)
    try:
        encoded_uid = payload.get("uid")
        if not isinstance(encoded_uid, str) or len(encoded_uid) > 256:
            raise ValueError
        uid = force_str(urlsafe_base64_decode(encoded_uid))
        token = payload.get("token")
        if not isinstance(token, str) or len(uid) > 128:
            raise ValueError
    except (ValueError, UnicodeDecodeError, TypeError, OverflowError):
        return response(message="重设链接无效或已过期", status=400)
    with transaction.atomic():
        user = User.objects.select_for_update().filter(pk=uid).first()
        if (
            not user
            or not user.account_enabled
            or not default_token_generator.check_token(user, token)
        ):
            return response(message="重设链接无效或已过期", status=400)
        form = SetPasswordForm(
            user,
            {
                "new_password1": payload.get("password"),
                "new_password2": payload.get("passwordConfirm"),
            },
        )
        if not form.is_valid():
            return form_error(form)
        form.save()
    logger.info("Account password reset uid=%s", uid)
    return response()


@require_POST
@endpoint(authenticated=True, limit=10)
def change_password(request):
    if not valid_password_fields(request.payload, "oldPassword", "password", "passwordConfirm"):
        return response(message="密码格式不正确", status=400)
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=request.user.pk)
        form = PasswordChangeForm(
            user,
            {
                "old_password": request.payload.get("oldPassword"),
                "new_password1": request.payload.get("password"),
                "new_password2": request.payload.get("passwordConfirm"),
            },
        )
        if not form.is_valid():
            return form_error(form)
        form.save()
    update_session_auth_hash(request, user)
    logger.info("Account password changed uid=%s", user.pk)
    return response()
