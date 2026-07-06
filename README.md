# Astron Agent - OpenClaw Trigger Integration

This service provides an API endpoint for OpenClaw to trigger Astron Agent to execute secured RPA workflows.

## Features
- Secure webhook endpoint with authentication (API key)
- Workflow authorization based on allowed list
- Audit logging for all triggers
- Dispatch to RPA system asynchronously

## API Endpoint
### POST /v1/trigger
Request payload:
```json
{
  "workflow_id": "finance_reimbursement",
  "trigger_source": "openclaw",
  "correlation_id": "optional-correlation",
  "payload": {}
}
```
Response:
```json
{
  "status": "accepted",
  "execution_id": "uuid",
  "message": "Trigger accepted, RPA task dispatched."
}
```

## Configuration
Set environment variables or create `.env` file:
- `RPA_API_ENDPOINT`: RPA system API URL
- `RPA_API_KEY`: API key for RPA system
- `ALLOWED_WORKFLOWS`: comma-separated list of allowed workflow IDs

## Running
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Docker
```bash
docker build -t astron-trigger .
docker run -p 8000:8000 astron-trigger
```
