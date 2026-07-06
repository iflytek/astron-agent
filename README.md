# Astron Agent - OpenClaw Trigger Integration

## Overview
This feature enables OpenClaw to trigger Astron Agent for executing high-risk, fixed-scenario workflows using RPA bots. It ensures sensitive operations (e.g., finance reimbursement, contract entry, core data modification) are performed under strict control with human-in-the-loop approval.

## Architecture
1. **OpenClaw** sends a signed HTTP request to Astron Agent API.
2. **Astron Agent** validates API key and HMAC signature.
3. **Astron Agent** checks permissions and initiates approval (if required).
4. Upon approval, Astron Agent schedules an RPA bot to execute the predefined workflow.
5. All actions are logged for audit.

## Files
- `openclaw_trigger.py`: Example code for OpenClaw to trigger Astron Agent.
- `astron_agent_handler.py`: Flask API handler for Astron Agent.
- `config.yaml`: Configuration for workflows, auth, and logging.

## Usage
1. Deploy `astron_agent_handler.py` as a secured Flask service.
2. Update `config.yaml` with your API keys, secrets, and workflow definitions.
3. In OpenClaw, use `openclaw_trigger.py` to send trigger requests.

## Security
- API key and HMAC signature ensure request authenticity.
- HTTPS (TLS) is mandatory.
- Human approval is enforced for high-risk workflows.
- Audit logs retain for compliance (default 365 days).
