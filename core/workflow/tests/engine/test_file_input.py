from unittest.mock import Mock, patch

import pytest

from workflow.engine.entities.file import File
from workflow.exception.e import CustomException


def test_private_console_file_size_uses_get_and_closes_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OSS_ENDPOINT", "http://minio:9000")
    url = (
        f"http://minio:9000/console/published-workflow-inputs/{'a' * 32}/input.txt"
        "?X-Amz-Signature=private"
    )
    response = Mock(headers={"Content-Length": "24"})
    with patch("requests.head") as head, patch(
        "requests.get", return_value=response
    ) as get:
        assert File.get_file_size(url) == "24"
        head.assert_not_called()
        get.assert_called_once_with(url, allow_redirects=False, stream=True, timeout=10)
        response.close.assert_called_once()

    response.raise_for_status.side_effect = RuntimeError(url)
    with patch("requests.get", return_value=response), pytest.raises(
        CustomException
    ) as exc:
        File.get_file_size(url)
    assert "X-Amz-Signature" not in str(exc.value)
