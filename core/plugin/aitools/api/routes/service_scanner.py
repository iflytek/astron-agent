"""
ServiceScanner module for scanning and loading API services.
"""

import importlib
import pkgutil
from typing import Callable, Iterable

import plugin.aitools.service as service_pkg


def iter_api_services() -> Iterable[Callable]:
    """
    Scan Service directory and yield all API services.
    """
    base_pkg_name = service_pkg.__name__  # "plugin.aitools.service"

    for module_info in pkgutil.walk_packages(
        service_pkg.__path__,
        prefix=base_pkg_name + ".",
    ):
        try:
            module = importlib.import_module(module_info.name)
        except Exception:
            raise

        for attr in vars(module).values():
            if callable(attr) and hasattr(attr, "__api_meta__"):
                yield attr
