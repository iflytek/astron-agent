# Alembic Database Migration

Generic single-database configuration.

## Automatic Migration

When the server starts, it will automatically:
1. Check if tables exist without `alembic_version` → stamp to current version
2. Run `alembic upgrade head` to apply any pending migrations
3. Use Redis lock to ensure only one instance runs migrations at a time

## Manual Migration Commands

### Create a new migration
```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of changes"

# Create empty migration file
alembic revision -m "description of changes"
```

### Rollback migrations

**⚠️ Important Notes:**
1. **Downgrade database first** - Run the downgrade command in the **new version code** (which contains the downgrade migration)
2. **Then downgrade service** - After database downgrade is complete, downgrade the workflow service to the compatible version and restart it
3. **Data loss risk** - Downgrading may cause data loss if the migration removes columns or tables. Always backup your database first

```bash
# Downgrade one step
alembic downgrade -1

# Downgrade to specific version
alembic downgrade <revision>

# Downgrade all migrations
alembic downgrade base
```


## Workflow for Model Changes

1. **Modify your SQLModel classes** in `workflow/domain/models/`
2. **Generate migration**:
   ```bash
   alembic revision --autogenerate -m "add user table"
   ```
3. **Review the generated file** in `alembic/versions/`
4. **Edit if needed** - autogenerate may not catch everything:
   - Data migrations
   - Index renames
   - Complex constraint changes

5. **Commit** the migration file to git