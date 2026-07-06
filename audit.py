import logging
import json
from datetime import datetime

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger('audit')
        handler = logging.FileHandler('audit.log')
        handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def log(self, event: str, details: dict):
        log_entry = {
            'event': event,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details
        }
        self.logger.info(json.dumps(log_entry))