"""Exercise the shared resource HTTP boundary through Django middleware."""

from django.core.exceptions import PermissionDenied
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, SimpleTestCase, override_settings
from django.urls import path

from astron_console.accounts.views import csrf_token
from astron_console.http import api_endpoint


@api_endpoint(["POST", "PATCH"], authenticated=False)
def receive(request):
    return {"payload": request.payload, "files": list(request.FILES)}


@api_endpoint(["GET"])
def private(request):
    return {"secret": "not-public"}


@api_endpoint(["GET"], authenticated=False)
def denied(request):
    raise PermissionDenied("internal-storage-key-not-for-the-client")


urlpatterns = [
    path("csrf", csrf_token),
    path("receive", receive),
    path("private", private),
    path("denied", denied),
]


@override_settings(ROOT_URLCONF=__name__)
class ResourceHttpBoundaryTests(SimpleTestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.token = self.client.get("/csrf").json()["data"]["csrfToken"]

    def test_resource_json_and_multipart_writes_require_csrf(self):
        self.assertEqual(
            self.client.post("/receive", {}, content_type="application/json").status_code, 403
        )
        self.assertEqual(
            self.client.post(
                "/receive", {"file": SimpleUploadedFile("test.txt", b"data")}
            ).status_code,
            403,
        )
        result = self.client.post(
            "/receive",
            {"repoId": "9", "file": SimpleUploadedFile("test.txt", b"data")},
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["data"], {"payload": {"repoId": "9"}, "files": ["file"]})
        self.assertEqual(result["Cache-Control"], "no-store")

    def test_partial_update_parses_json_and_rejects_invalid_root(self):
        for raw in ("[]", "null", '"value"', "{bad"):
            result = self.client.patch(
                "/receive", raw, content_type="application/json", HTTP_X_CSRFTOKEN=self.token
            )
            self.assertEqual(result.status_code, 400)
        result = self.client.patch(
            "/receive",
            {"name": "resource"},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(result.json()["data"]["payload"], {"name": "resource"})
        self.assertEqual(self.client.get("/receive").status_code, 405)

    def test_anonymous_and_permission_failures_do_not_reveal_data(self):
        self.assertEqual(self.client.get("/private").status_code, 401)
        result = self.client.get("/denied")
        self.assertEqual(result.status_code, 403)
        self.assertNotContains(result, "internal-storage-key", status_code=403)

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=16)
    def test_oversize_json_returns_an_explicit_resource_error(self):
        result = self.client.patch(
            "/receive",
            {"name": "x" * 100},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(result.status_code, 413)
