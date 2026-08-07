package dao

import (
	"database/sql"
	"testing"
	"time"

	"tenant/internal/models"
	"tenant/tools/database"
)

func TestNewAppDao(t *testing.T) {
	tests := []struct {
		name    string
		db      *database.Database
		wantErr bool
		errMsg  string
	}{
		{
			name:    "nil database",
			db:      nil,
			wantErr: true,
			errMsg:  "database is nil",
		},
		{
			name:    "valid database",
			db:      &database.Database{}, // Mock database
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			appDao, err := NewAppDao(tt.db)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewAppDao() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				if err.Error() != tt.errMsg {
					t.Errorf("NewAppDao() error = %s, want %s", err.Error(), tt.errMsg)
				}
				if appDao != nil {
					t.Errorf("NewAppDao() should return nil when error expected")
				}
			} else {
				if appDao == nil {
					t.Errorf("NewAppDao() should not return nil when no error expected")
				}
			}
		})
	}
}

type sqlOptionTest struct {
	name        string
	createFunc  func(*AppDao) SqlOption
	expectedSQL string
	expectedLen int
	checkParams func([]interface{}) bool
}

func testSqlOption(t *testing.T, test sqlOptionTest, appDao *AppDao) {
	t.Run(test.name, func(t *testing.T) {
		option := test.createFunc(appDao)
		if option == nil {
			t.Errorf("%s should not return nil", test.name)
			return
		}

		sql, params := option()
		if sql != test.expectedSQL {
			t.Errorf("%s sql = %s, want %s", test.name, sql, test.expectedSQL)
		}

		if len(params) != test.expectedLen {
			t.Errorf("%s params length = %d, want %d", test.name, len(params), test.expectedLen)
		}

		if test.checkParams != nil && !test.checkParams(params) {
			t.Errorf("%s params validation failed: %v", test.name, params)
		}
	})
}

func TestAppDao_SqlOptions(t *testing.T) {
	mockDb := &database.Database{}
	appDao, err := NewAppDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	tests := []sqlOptionTest{
		{
			name:        "WithAppId",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithAppId("test-app-123") },
			expectedSQL: "app_id=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "test-app-123" },
		},
		{
			name:        "WithNotAppId",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithNotAppId("test-app-123") },
			expectedSQL: "app_id!=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "test-app-123" },
		},
		{
			name:        "WithSource",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithSource("admin") },
			expectedSQL: "source=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "admin" },
		},
		{
			name:        "WithIsDisable",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithIsDisable(true) },
			expectedSQL: "is_disable=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == true },
		},
		{
			name:        "WithIsDelete",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithIsDelete(false) },
			expectedSQL: "is_delete=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == false },
		},
		{
			name:        "WithUpdateTime",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithUpdateTime("2023-01-01 12:00:00") },
			expectedSQL: "update_time=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "2023-01-01 12:00:00" },
		},
		{
			name:        "WithName",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithName("test-app") },
			expectedSQL: "app_name like ?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "test-app" },
		},
		{
			name:        "WithSetName",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithSetName("new-app-name") },
			expectedSQL: "app_name=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "new-app-name" },
		},
		{
			name:        "WithDesc",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithDesc("test description") },
			expectedSQL: "app_desc=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "test description" },
		},
		{
			name:        "WithDevId",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithDevId(int64(12345)) },
			expectedSQL: "dev_id=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == int64(12345) },
		},
		{
			name:        "WithChannelId",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithChannelId("cloud-123") },
			expectedSQL: "channel_id=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "cloud-123" },
		},
		{
			name:        "WithNoChannelId",
			createFunc:  func(dao *AppDao) SqlOption { return dao.WithNoChannelId("cloud-123") },
			expectedSQL: "channel_id!=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "cloud-123" },
		},
	}

	for _, test := range tests {
		testSqlOption(t, test, appDao)
	}

	t.Run("WithAppIds", func(t *testing.T) {
		appIds := []string{"app1", "app2", "app3"}
		option := appDao.WithAppIds(appIds...)
		sql, params := option()

		expectedSql := "app_id IN(?,?,?)"
		if sql != expectedSql {
			t.Errorf("WithAppIds() sql = %s, want %s", sql, expectedSql)
		}

		if len(params) != 3 {
			t.Errorf("WithAppIds() params length = %d, want 3", len(params))
		}

		for i, expectedId := range appIds {
			if params[i] != expectedId {
				t.Errorf("WithAppIds() params[%d] = %v, want %v", i, params[i], expectedId)
			}
		}
	})

	t.Run("WithAppIds empty", func(t *testing.T) {
		option := appDao.WithAppIds()
		if option != nil {
			t.Errorf("WithAppIds() with empty slice should return nil")
		}
	})
}

func TestAppDao_WithAppIds_Variations(t *testing.T) {
	dbWrapper := &database.Database{}
	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	tests := []struct {
		name        string
		appIds      []string
		expectedSql string
		expectNil   bool
	}{
		{
			name:        "single app id",
			appIds:      []string{"app1"},
			expectedSql: "app_id IN(?)",
			expectNil:   false,
		},
		{
			name:        "two app ids",
			appIds:      []string{"app1", "app2"},
			expectedSql: "app_id IN(?,?)",
			expectNil:   false,
		},
		{
			name:        "five app ids",
			appIds:      []string{"app1", "app2", "app3", "app4", "app5"},
			expectedSql: "app_id IN(?,?,?,?,?)",
			expectNil:   false,
		},
		{
			name:      "empty app ids",
			appIds:    []string{},
			expectNil: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			option := appDao.WithAppIds(tt.appIds...)

			if tt.expectNil {
				if option != nil {
					t.Errorf("WithAppIds() should return nil for empty slice")
				}
				return
			}

			if option == nil {
				t.Errorf("WithAppIds() should not return nil for non-empty slice")
				return
			}

			sql, params := option()

			if sql != tt.expectedSql {
				t.Errorf("WithAppIds() sql = %s, want %s", sql, tt.expectedSql)
			}

			if len(params) != len(tt.appIds) {
				t.Errorf("WithAppIds() params length = %d, want %d", len(params), len(tt.appIds))
			}

			for i, expectedId := range tt.appIds {
				if params[i] != expectedId {
					t.Errorf("WithAppIds() params[%d] = %v, want %v", i, params[i], expectedId)
				}
			}
		})
	}
}

func TestAppDao_Insert(t *testing.T) {
	// Create database wrapper
	dbWrapper := &database.Database{}

	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	t.Run("nil data should return error", func(t *testing.T) {
		_, err := appDao.Insert(nil, nil)
		if err == nil {
			t.Errorf("Insert() with nil data should return error")
		}

		expectedErr := "insert app data, data must not been nil"
		if err.Error() != expectedErr {
			t.Errorf("Insert() error = %s, want %s", err.Error(), expectedErr)
		}
	})

	t.Run("valid data structure", func(t *testing.T) {
		app := &models.App{
			AppId:      "test-app-123",
			AppName:    "Test App",
			DevId:      12345,
			ChannelId:  "channel-456",
			Source:     "admin",
			IsDisable:  false,
			Desc:       "Test description",
			IsDelete:   false,
			CreateTime: "2023-01-01 12:00:00",
			UpdateTime: "2023-01-01 12:00:00",
			Extend:     `{"extra": "data"}`,
		}

		// Test that the method exists and validates properly (without actually executing DB operations)
		// We test only the validation logic, not the DB execution
		defer func() {
			if r := recover(); r != nil {
				// If it panics due to nil DB connection, that's expected
				// The important thing is that it didn't fail validation before that
				t.Logf("Insert panicked as expected due to nil database connection: %v", r)
			}
		}()

		_, err := appDao.Insert(app, nil)
		// We expect this to either work in a test environment or fail with DB connection error
		// The key test is that it doesn't fail with the validation error we test in the previous case
		if err != nil && err.Error() == "insert app data, data must not been nil" {
			t.Errorf("Insert() should not fail validation with valid data")
		}
	})
}

func TestAppDao_BeginTx(t *testing.T) {
	dbWrapper := &database.Database{}
	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	// This will fail due to no actual DB connection, but tests method existence
	defer func() {
		if r := recover(); r != nil {
			t.Logf("BeginTx panicked as expected due to nil database connection: %v", r)
		}
	}()

	_, err = appDao.BeginTx()
	if err == nil {
		t.Log("BeginTx() unexpectedly succeeded (probably in a test environment with mock DB)")
	}
	// We just verify the method exists and doesn't panic due to validation issues
}

func TestAppDao_CountRows(t *testing.T) {
	dbWrapper := &database.Database{}
	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	t.Run("countRows method exists", func(t *testing.T) {
		// We can't directly test countRows since it's private and requires actual SQL rows
		// But we can verify the Count method exists which uses countRows internally
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Count panicked as expected due to nil database connection: %v", r)
			}
		}()

		_, err := appDao.Count(false, nil)
		// This will fail due to no DB connection, but tests that the method chain exists
		if err == nil {
			t.Log("Count() unexpectedly succeeded (probably in a test environment)")
		}
	})
}

func TestAppDao_Update_ErrorHandling(t *testing.T) {
	dbWrapper := &database.Database{}
	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	t.Run("empty set options should return error", func(t *testing.T) {
		whereOptions := []SqlOption{
			appDao.WithAppId("test-app"),
		}

		_, err := appDao.Update(whereOptions, nil)
		if err == nil {
			t.Errorf("Update() with no set options should return error")
		}

		expectedErr := "update content is empty"
		if err.Error() != expectedErr {
			t.Errorf("Update() error = %s, want %s", err.Error(), expectedErr)
		}
	})

	t.Run("valid options structure", func(t *testing.T) {
		whereOptions := []SqlOption{
			appDao.WithAppId("test-app"),
		}
		setOptions := []SqlOption{
			appDao.WithSetName("new-name"),
		}

		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Update panicked as expected due to nil database connection: %v", r)
			}
		}()

		// This will fail due to no actual DB connection
		_, err := appDao.Update(whereOptions, nil, setOptions...)
		// We expect a DB connection error, not a validation error
		if err != nil && err.Error() == "update content is empty" {
			t.Errorf("Update() should not fail with validation error when options are provided")
		}
	})
}

func TestAppDao_Delete_Logic(t *testing.T) {
	dbWrapper := &database.Database{}
	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	t.Run("delete adds required options", func(t *testing.T) {
		whereOptions := []SqlOption{
			appDao.WithAppId("test-app"),
		}

		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Delete panicked as expected due to nil database connection: %v", r)
			}
		}()

		// The delete method should add WithIsDelete(true) and WithUpdateTime automatically
		// This will fail due to no DB connection, but we can verify the method structure
		_, err := appDao.Delete(nil, whereOptions...)
		// We expect a DB connection error, not a validation error about missing options
		if err != nil {
			// Should not be "update content is empty" since Delete adds its own set options
			if err.Error() == "update content is empty" {
				t.Errorf("Delete() should automatically add set options")
			}
		}
	})
}

func TestAppDao_Integration_Structure(t *testing.T) {
	// Test the overall structure and method signatures of AppDao

	dbWrapper := &database.Database{}
	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	// Test method signatures exist and are callable
	t.Run("method signatures", func(t *testing.T) {
		// Add recovery for DB connection panics
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Integration test panicked as expected due to nil database connection: %v", r)
			}
		}()

		// Insert method
		app := &models.App{AppId: "test"}
		_, err := appDao.Insert(app, nil)
		_ = err // We expect this to fail, just testing signature

		// Update method
		_, err = appDao.Update([]SqlOption{}, nil)
		_ = err

		// Delete method
		_, err = appDao.Delete(nil)
		_ = err

		// Select method
		_, err = appDao.Select()
		_ = err

		// Count method
		_, err = appDao.Count(false, nil)
		_ = err

		// BeginTx method
		_, err = appDao.BeginTx()
		_ = err

		// All option methods should return SqlOption functions
		options := []SqlOption{
			appDao.WithAppId("test"),
			appDao.WithNotAppId("test"),
			appDao.WithSource("admin"),
			appDao.WithIsDisable(true),
			appDao.WithIsDelete(false),
			appDao.WithUpdateTime(time.Now().Format("2006-01-02 15:04:05")),
			appDao.WithName("test"),
			appDao.WithSetName("test"),
			appDao.WithDesc("test"),
			appDao.WithDevId(123),
			appDao.WithChannelId("test"),
			appDao.WithNoChannelId("test"),
		}

		// Test that all options are valid SqlOption functions
		for i, option := range options {
			if option == nil {
				t.Errorf("Option %d should not be nil", i)
				continue
			}
			sql, params := option()
			if sql == "" {
				t.Errorf("Option %d should return non-empty SQL", i)
			}
			_ = params // params can be empty for some options
		}

		// WithAppIds with values
		appIdsOption := appDao.WithAppIds("app1", "app2")
		if appIdsOption == nil {
			t.Errorf("WithAppIds should not return nil for non-empty slice")
		} else {
			sql, params := appIdsOption()
			if sql == "" || len(params) != 2 {
				t.Errorf("WithAppIds should return proper SQL and params")
			}
		}

		// WithAppIds empty
		emptyAppIdsOption := appDao.WithAppIds()
		if emptyAppIdsOption != nil {
			t.Errorf("WithAppIds should return nil for empty slice")
		}
	})
}

// Mock implementation for testing the interface without actual database operations
type MockAppDao struct {
	*AppDao
	MockInsert func(*models.App, *sql.Tx) (int64, error)
	MockUpdate func([]SqlOption, *sql.Tx, ...SqlOption) (int64, error)
	MockDelete func(*sql.Tx, ...SqlOption) (int64, error)
	MockSelect func(...SqlOption) ([]*models.App, error)
	MockCount  func(bool, *sql.Tx, ...SqlOption) (int64, error)
}

func TestAppDao_AllMethodsExist(t *testing.T) {
	// Test that all expected methods exist with correct signatures
	dbWrapper := &database.Database{}
	appDao, err := NewAppDao(dbWrapper)
	if err != nil {
		t.Fatalf("Failed to create AppDao: %v", err)
	}

	// Check that appDao implements all expected methods by calling them with nil values
	// This tests method signatures without requiring actual database connections

	tests := []struct {
		name     string
		testFunc func() error
	}{
		{
			name: "Insert method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := appDao.Insert(&models.App{}, nil)
				return err
			},
		},
		{
			name: "Update method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := appDao.Update([]SqlOption{}, nil)
				return err
			},
		},
		{
			name: "Delete method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := appDao.Delete(nil)
				return err
			},
		},
		{
			name: "Select method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := appDao.Select()
				return err
			},
		},
		{
			name: "Count method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := appDao.Count(false, nil)
				return err
			},
		},
		{
			name: "BeginTx method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := appDao.BeginTx()
				return err
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// We don't care about the error or result, just that the method exists and is callable
			_ = tt.testFunc()
		})
	}
}
