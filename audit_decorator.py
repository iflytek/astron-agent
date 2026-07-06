import logging
import functools
import json
from datetime import datetime

def audit_log(func):
    """Decorator to log all executions with traceability."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = datetime.utcnow()
        result = func(*args, **kwargs)
        end = datetime.utcnow()
        log_entry = {
            "function": func.__name__,
            "args": args,
            "kwargs": kwargs,
            "result": str(result),
            "start_time": start.isoformat(),
            "end_time": end.isoformat()
        }
        logging.getLogger("audit").info(json.dumps(log_entry))
        return result
    return wrapper