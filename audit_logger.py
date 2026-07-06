import logging
import os
from datetime import datetime
from config import LOG_DIR, LOG_LEVEL

class AuditLogger:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_logger()
        return cls._instance

    def _init_logger(self):
        if not os.path.exists(LOG_DIR):
            os.makedirs(LOG_DIR)
        self.logger = logging.getLogger('AuditLogger')
        self.logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))
        fh = logging.FileHandler(os.path.join(LOG_DIR, f'audit_{datetime.now().strftime("%Y%m%d")}.log'))
        fh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(fh)

    def log_event(self, event_type: str, details: dict):
        self.logger.info(f'{event_type} | {details}')

    def log_error(self, event_type: str, details: dict):
        self.logger.error(f'{event_type} | {details}')

audit_logger = AuditLogger()
