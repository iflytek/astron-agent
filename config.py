import os

class Config:
    def __init__(self):
        self.webhook_secret = os.environ.get('OPENCLAW_WEBHOOK_SECRET', 'default-secret-change-in-production')
        self.allowed_workflows = os.environ.get('ALLOWED_WORKFLOWS', 'financial_reimbursement,contract_entry').split(',')
        self.require_approval = os.environ.get('REQUIRE_APPROVAL', 'true').lower() == 'true'