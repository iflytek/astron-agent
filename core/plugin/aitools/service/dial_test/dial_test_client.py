"""
Dial test client
"""

# pylint: disable=too-many-arguments,too-few-public-methods,broad-exception-caught
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, TypedDict, Union

import requests


class ErrorResponse(TypedDict):
    """Error response data type"""

    code: int
    message: str
    data: Dict[str, str]


class APIConfiguration:
    """API configuration data type"""

    def __init__(
        self,
        target_url: str,
        method: str,
        headers: Dict[str, str],
        params: Dict[str, Any],
        payload: Dict[str, Any],
        success_code: int,
        call_frequency: int,
    ) -> None:
        self.url = target_url
        self.method = method
        self.headers = headers
        self.params = params
        self.payload = payload
        self.success_code = success_code
        self.call_frequency = call_frequency

    def dict(self) -> dict:
        """Return API configuration as a dictionary."""
        return {
            "url": self.url,
            "method": self.method,
            "headers": self.headers,
            "params": self.params,
            "payload": self.payload,
            "timeout": 60,
        }


class APITester:
    """API tester class"""

    def execute_request(
        self, config: APIConfiguration
    ) -> Union[ErrorResponse, Dict[str, Any]]:
        """Execute API request with specified configuration."""
        ex_res: ErrorResponse = {
            "code": -1,
            "message": "failed",
            "data": {"url": config.url, "msg": "error"},
        }
        try:
            response = requests.request(**config.dict())
            response.raise_for_status()
            code = response.json().get("code")
            if code != config.success_code:
                res = response.json()
                res["code"] = (
                    str(res["code"]) + "_" + str(config.url).rsplit("/", maxsplit=1)[-1]
                )
                return res
            return {}
        except requests.exceptions.Timeout:
            ex_res["data"]["msg"] = "The request timed out."
            # print("The request timed out.")
        except requests.exceptions.HTTPError as http_err:
            ex_res["data"]["msg"] = f"HTTP error occurred: {http_err}"
            # print(f"HTTP error occurred: {http_err}")
        except Exception as e:
            ex_res["data"]["msg"] = f"An unexpected error occurred: {e}"
            # print(f"An unexpected error occurred: {e}")
        return ex_res


class MainRunner:
    """Main runner class"""

    def __init__(self, max_workers: Optional[int] = None) -> None:
        """Initialize the main runner."""
        # load_dotenv('../../../dialtest.env')
        self.api_configs = self.load_api_configs()
        self.tester = APITester()
        self.max_workers = (
            max_workers or (len(self.api_configs) * 2) + 1
        )  # Default to a reasonable number of workers

    # List of interfaces to test
    def interface_list(self) -> List[str]:
        """Get list of interfaces to test."""
        # int_list = ["TTS", "SMARTTS"]

        # print('("INTERFACE_LIST_STR"):',os.getenv("INTERFACE_LIST_STR"))
        int_list_str = os.getenv("INTERFACE_LIST_STR")
        if int_list_str:
            int_list = int_list_str.split(",")
        else:
            int_list = []
        return int_list

    def load_api_configs(self) -> List[APIConfiguration]:
        """Load API configurations from environment variables."""
        configs = []
        for prefix in self.interface_list():
            configs.append(
                APIConfiguration(
                    target_url=os.getenv(f"{prefix}_URL", ""),
                    method=os.getenv(f"{prefix}_METHOD", "GET"),
                    headers=json.loads(os.getenv(f"{prefix}_HEADERS", "{}")),
                    params=json.loads(os.getenv(f"{prefix}_PARAMS", "{}")),
                    payload=json.loads(os.getenv(f"{prefix}_PAYLOAD", "{}")),
                    success_code=int(os.getenv(f"{prefix}_SUCCESS_CODE", "-1")),
                    call_frequency=int(os.getenv(f"{prefix}_CALL_FREQUENCY", "1")),
                )
            )

        return configs

    def run_tests(self) -> Dict[str, Any]:
        """Run API tests and return results."""
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self.tester.execute_request, config): config
                for config in self.api_configs
            }
            results: Dict[str, Any] = {}
            for future in as_completed(futures):
                config = futures[future]
                try:
                    api_result = future.result()
                    results[config.url] = api_result
                except Exception as exc:
                    results[config.url] = (
                        f"API test for {config.url} generated an exception: {exc}"
                    )
                    # print(f"API test for {config.url} generated an exception: {exc}")
            return results


if __name__ == "__main__":
    # runner = MainRunner('../../../dialtest.env')
    runner = MainRunner()
    all_results = runner.run_tests()

    # Print results
    for url, result in all_results.items():
        print(f"Result for {url}: {result}")
