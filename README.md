# Astron Agent - OpenClaw Integration

This module provides the ability for OpenClaw to trigger Astron Agent to execute secure RPA workflows.

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Set environment variable `OPENCLAW_WEBHOOK_SECRET` with shared secret.
3. Run `webhook_handler.py`.

## Webhook Endpoint
- **URL**: `POST /webhook/trigger`
- **Headers**: `X-OpenClaw-Signature` (HMAC-SHA256 of request body)
- **Body**: `{"workflow_id": "financial_reimbursement", "params": {"report_id": "123"}}`

## Workflows
- `financial_reimbursement`: Handles expense report processing.
- Add more workflows in `workflows/` directory and register in `__init__.py`.