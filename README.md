# OpenClaw → Astron Agent Integration for Secure RPA Execution

## Overview
This feature enables OpenClaw to trigger high-privilege workflows handled by Astron Agent's integrated RPA robots. All operations are logged and require human approval for sensitive actions.

## Components
1. **OpenClaw Trigger** (`openclaw_trigger.py`): Receives trigger requests, verifies HMAC signature, and forwards to Astron Agent.
2. **Astron Agent Handler** (`astron_agent_handler.py`): Validates workflow permissions, enforces human-in-the-loop, and dispatches RPA robot.
3. **Configuration** (`config.yaml`): Shared secret, allowed workflows, RPA settings.

## Security
- HMAC SHA-256 signature on all requests between OpenClaw and Astron Agent.
- Workflow whitelist enforced server-side.
- Human approval required for execution (configurable).
- All actions logged with audit trail.

## Usage
1. Deploy `astron_agent_handler.py` on Astron Agent server (port 5001).
2. Deploy `openclaw_trigger.py` on OpenClaw side (port 5000) pointing to Astron Agent URL.
3. Set `secret_key` in both environment and config.
4. OpenClaw sends POST to `/trigger` with JSON body `{"workflow_id": "...", "parameters": {...}}` and HMAC signature in `X-Signature` header.

## Example Trigger Request
```bash
curl -X POST https://openclaw-trigger:5000/trigger \
  -H "Content-Type: application/json" \
  -H "X-Signature: <hmac_hex>" \
  -d '{"workflow_id": "finance_reimbursement", "parameters": {"amount": 1000}}'
```

## Success Criteria
- OpenClaw triggers Astron Agent workflow successfully.
- Astron Agent executes RPA robot with proper logs.
- All operations comply with enterprise security standards.
