package database

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

const (
	migrationTableName = "schema_migrations"
	migrationLockName  = "tenant_database_migration_lock"
	initVersion        = "20260326_0001"
)

type migration struct {
	Version     string
	Description string
	Statements  []string
}

var migrations = []migration{
	{
		Version:     initVersion,
		Description: "init tenant tables and seed data",
		Statements:  tenantInitStatements,
	},
}

func runMigrations(client *sql.DB) error {
	if client == nil {
		return errors.New("mysql client is nil")
	}

	if err := ensureMigrationTable(client); err != nil {
		return err
	}

	unlock, err := acquireMigrationLock(client)
	if err != nil {
		return err
	}
	defer unlock()

	if err := stampLegacyDatabase(client); err != nil {
		return err
	}

	appliedVersions, err := loadAppliedVersions(client)
	if err != nil {
		return err
	}

	for _, item := range migrations {
		if appliedVersions[item.Version] {
			continue
		}
		if err := applyMigration(client, item); err != nil {
			return err
		}
	}

	return nil
}

func ensureMigrationTable(client *sql.DB) error {
	_, err := client.Exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
	version varchar(64) NOT NULL,
	description varchar(255) NOT NULL,
	applied_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Tenant schema migration history'`)
	if err != nil {
		return fmt.Errorf("create migration table failed: %w", err)
	}
	return nil
}

func acquireMigrationLock(client *sql.DB) (func(), error) {
	var locked int
	err := client.QueryRow("SELECT GET_LOCK(?, 60)", migrationLockName).Scan(&locked)
	if err != nil {
		return nil, fmt.Errorf("acquire migration lock failed: %w", err)
	}
	if locked != 1 {
		return nil, fmt.Errorf("acquire migration lock failed: lock not granted")
	}

	return func() {
		var released sql.NullInt64
		_ = client.QueryRow("SELECT RELEASE_LOCK(?)", migrationLockName).Scan(&released)
	}, nil
}

func stampLegacyDatabase(client *sql.DB) error {
	appliedVersions, err := loadAppliedVersions(client)
	if err != nil {
		return err
	}
	if len(appliedVersions) > 0 {
		return nil
	}

	existing, err := hasLegacyTenantSchema(client)
	if err != nil {
		return err
	}
	if !existing {
		return nil
	}

	return recordMigration(client, migrations[0])
}

func hasLegacyTenantSchema(client *sql.DB) (bool, error) {
	requiredTables := []string{"tb_app", "tb_auth"}
	for _, tableName := range requiredTables {
		var count int
		err := client.QueryRow(
			`SELECT COUNT(1) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
			tableName,
		).Scan(&count)
		if err != nil {
			return false, fmt.Errorf("check legacy table %s failed: %w", tableName, err)
		}
		if count == 0 {
			return false, nil
		}
	}
	return true, nil
}

func loadAppliedVersions(client *sql.DB) (map[string]bool, error) {
	rows, err := client.Query("SELECT version FROM schema_migrations")
	if err != nil {
		return nil, fmt.Errorf("query applied migrations failed: %w", err)
	}
	defer func() {
		_ = rows.Close()
	}()

	appliedVersions := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("scan applied migration failed: %w", err)
		}
		appliedVersions[version] = true
	}
	return appliedVersions, nil
}

func applyMigration(client *sql.DB, item migration) error {
	tx, err := client.Begin()
	if err != nil {
		return fmt.Errorf("begin migration transaction failed: %w", err)
	}

	for _, statement := range item.Statements {
		if _, err := tx.Exec(statement); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("execute migration %s failed: %w", item.Version, err)
		}
	}

	if err := recordMigrationTx(tx, item); err != nil {
		_ = tx.Rollback()
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s failed: %w", item.Version, err)
	}
	return nil
}

func recordMigration(client *sql.DB, item migration) error {
	_, err := client.Exec(
		"INSERT IGNORE INTO schema_migrations(version, description, applied_at) VALUES (?, ?, ?)",
		item.Version,
		item.Description,
		time.Now().Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		return fmt.Errorf("record migration %s failed: %w", item.Version, err)
	}
	return nil
}

func recordMigrationTx(tx *sql.Tx, item migration) error {
	_, err := tx.Exec(
		"INSERT INTO schema_migrations(version, description, applied_at) VALUES (?, ?, ?)",
		item.Version,
		item.Description,
		time.Now().Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		return fmt.Errorf("record migration %s failed: %w", item.Version, err)
	}
	return nil
}
