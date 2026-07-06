import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AuditLogger:
    """
    Centralized audit logging for all triggered operations.
    Logs are written to a secure, append-only file.
    """
    def __init__(self, log_file: str = "audit.log"):
        self.log_file = log_file

    def log(self, entry: dict):
        entry["logged_at"] = datetime.utcnow().isoformat()
        with open(self.log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
        logger.info(f"Audit entry written: {entry.get('event_id')}")

    def query(self, filters: dict = None):
        # Placeholder: implement secure querying from audit log
        pass

# Singleton instance
audit_logger = AuditLogger()
