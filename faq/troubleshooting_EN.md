# Troubleshooting FAQ

## Database error "PostgreSQL node request error", "SQLSyntaxErrorException" or SQL syntax error?

1. Check SQL: Confirm that the generated SQL statement is valid and fields match.
2. Version sync: If the code is updated but the database reports an error, it may be that the database Schema is not synchronized. Try running `docker compose up -d atlas` or manually execute SQL to complete fields.
3. Common errors: `SQLSyntaxErrorException` is usually when the code is updated but the database has not automatically migrated. View the SQL error in the logs and manually execute the missing field addition operation in the database.

## Database migration failed "Validate failed: Migrations have failed validation"?

This is a Flyway version control conflict.
- Test environment: `docker compose down -v` to clear data and reset.
- Production environment: Manually fix the `flyway_schema_history` table.

## API error "auth name: Authorization, auth value: None"?

1. Token lost: The request header does not carry a valid Authorization Token.
2. Configuration error: Check that Casdoor Client ID/Secret matches `.env`.

## SSL error when calling third-party tools?

This is usually a container SSL certificate issue or caused by the network environment. Check if the container can normally access public HTTPS addresses.

## Service startup failure (e.g., astron-core-link returned non-zero exit status 1) how to troubleshoot?

1. Check ports: May be port conflict being occupied, please check the usage of related ports.
2. View logs: Use `docker logs <container_name>` to view detailed error logs to locate the problem.

## How to solve cross-origin (CORS) issues?

When the frontend calls the backend API and reports a cross-origin error, please check the Nginx proxy configuration or the CORS allowed domain configuration of the backend service.

## After startup, core-tenant or core-aitools services keep restarting and report that they cannot connect to the database?

1. Check if the MySQL configuration in the `.env` file is correct.
2. Try to manually restart the MySQL container: `docker restart astron-agent-mysql` (please confirm the specific container name through `docker ps`).
3. If the problem persists, try executing `docker compose down -v` to clean up and restart.

## Page access error or loading failure, how to troubleshoot?

1. Browser console: Press `Ctrl + Shift + I` (Windows) or `Cmd + Option + I` (Mac) to open developer tools, check the Network panel for request errors (red 4xx/500 errors).
2. View container logs:
   - View all logs: `docker compose logs -f`
   - View specific service logs: `docker compose logs -f <service name>` (for example `astron-agent-console-hub`, `astron-agent-core-tenant`).
   - Pay special attention to `core-tenant` (tenant service) and `console-hub` (console backend) logs.

## What to do if database update or missing fields cause errors?

Try to pull the latest code (`git pull`), then run `docker compose up -d atlas` to execute database migrations and update fields.

## "Failed to get application" error when calling workflow via API?

1. Check authentication information: Ensure that `Authorization: Bearer {API_KEY}:{API_SECRET}` is correctly passed in the Header.
2. Check ID matching:
   - Ensure that the `flow_id` used matches the published API ID.
   - Note the difference between App ID and Flow ID.
   - Confirm that the Host and Port in the request URL are correct (pointing to `console-hub` or gateway port).
3. Parameter replacement: If copying from example code, ensure placeholders like `xxx` have been replaced with actual values.
