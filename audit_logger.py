import logging
import json
from datetime import datetime

# Configure logging to a secure, centralized audit log
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("astron_audit.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("astron_audit")

def log_event(event_type: str, details: dict):
    """Log audit event with timestamp and event type."""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event_type": event_type,
        "details": details
    }
    logger.info(json.dumps(log_entry))
