import json
import logging
from datetime import datetime
import os

AUDIT_LOG_DIR = os.getenv("AUDIT_LOG_DIR", "/var/log/astron_agent")

def ensure_log_dir():
    if not os.path.exists(AUDIT_LOG_DIR):
        os.makedirs(AUDIT_LOG_DIR, exist_ok=True)

def log_execution(execution_id: str, workflow_id: str, status: str, context: dict):
    """
    Write audit log entry for each execution.
    """
    ensure_log_dir()
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "execution_id": execution_id,
        "workflow_id": workflow_id,
        "status": status,
        "context": {
            k: v for k, v in context.items() if k != "parameters" or v
        }
    }
    # Log to file
    log_file = os.path.join(AUDIT_LOG_DIR, f"{datetime.utcnow().strftime('%Y-%m-%d')}.log")
    with open(log_file, "a") as f:
        f.write(json.dumps(log_entry) + "\n")
    # Also log via standard logger
    logging.info(f"Audit: {json.dumps(log_entry)}")
