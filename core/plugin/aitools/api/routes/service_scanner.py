"""
ServiceScanner module for scanning and loading API services.
"""

import importlib
import pkgutil
import sys
from typing import Callable, Iterable

import plugin.aitools.service as service_pkg


def iter_api_services(*, force_reload: bool = False) -> Iterable[Callable]:
    """
    Scan Service directory and yield all API services.
    """
    base_pkg_name = service_pkg.__name__  # "plugin.aitools.service"

    for module_info in pkgutil.walk_packages(
        service_pkg.__path__,
        prefix=base_pkg_name + ".",
    ):
        try:
            if force_reload and module_info.name in sys.modules:
                module = importlib.reload(sys.modules[module_info.name])
            else:
                module = importlib.import_module(module_info.name)
        except Exception:
            raise

        for attr in vars(module).values():
            if callable(attr) and hasattr(attr, "__api_meta__"):
                yield attr
