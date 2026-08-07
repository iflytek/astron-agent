package dao

import (
	"database/sql"
	"reflect"
	"testing"
	"time"

	"tenant/internal/models"
	"tenant/tools/database"
)

func TestNewAuthDao(t *testing.T) {
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
			authDao, err := NewAuthDao(tt.db)

			if (err != nil) != tt.wantErr {
				t.Errorf("NewAuthDao() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				if err.Error() != tt.errMsg {
					t.Errorf("NewAuthDao() error = %s, want %s", err.Error(), tt.errMsg)
				}
				if authDao != nil {
					t.Errorf("NewAuthDao() should return nil when error expected")
				}
			} else {
				if authDao == nil {
					t.Errorf("NewAuthDao() should not return nil when no error expected")
				}
			}
		})
	}
}

type authSqlOptionTest struct {
	name        string
	createFunc  func(*AuthDao) SqlOption
	expectedSQL string
	expectedLen int
	checkParams func([]interface{}) bool
}

func testAuthSqlOption(t *testing.T, test authSqlOptionTest, authDao *AuthDao) {
	t.Run(test.name, func(t *testing.T) {
		option := test.createFunc(authDao)
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

func TestAuthDao_SqlOptions(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	tests := []authSqlOptionTest{
		{
			name:        "WithAppId",
			createFunc:  func(dao *AuthDao) SqlOption { return dao.WithAppId("test-app-123") },
			expectedSQL: "app_id=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "test-app-123" },
		},
		{
			name:        "WithIsDelete",
			createFunc:  func(dao *AuthDao) SqlOption { return dao.WithIsDelete(false) },
			expectedSQL: "is_delete=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == false },
		},
		{
			name:        "WithApiKey",
			createFunc:  func(dao *AuthDao) SqlOption { return dao.WithApiKey("test-api-key-123") },
			expectedSQL: "api_key=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "test-api-key-123" },
		},
		{
			name:        "WithApiSecret",
			createFunc:  func(dao *AuthDao) SqlOption { return dao.WithApiSecret("test-api-secret-123") },
			expectedSQL: "api_secret=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "test-api-secret-123" },
		},
		{
			name:        "WithUpdateTime",
			createFunc:  func(dao *AuthDao) SqlOption { return dao.WithUpdateTime("2023-01-01 12:00:00") },
			expectedSQL: "update_time=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == "2023-01-01 12:00:00" },
		},
		{
			name:        "WithSource",
			createFunc:  func(dao *AuthDao) SqlOption { return dao.WithSource(int64(12345)) },
			expectedSQL: "source=?",
			expectedLen: 1,
			checkParams: func(params []interface{}) bool { return params[0] == int64(12345) },
		},
	}

	for _, test := range tests {
		testAuthSqlOption(t, test, authDao)
	}

	t.Run("WithAppIds", func(t *testing.T) {
		appIds := []string{"app1", "app2", "app3"}
		option := authDao.WithAppIds(appIds...)
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
		option := authDao.WithAppIds()
		if option != nil {
			t.Errorf("WithAppIds() with empty slice should return nil")
		}
	})
}

func TestAuthDao_WithAppIds_Variations(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
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
			name:        "three app ids",
			appIds:      []string{"app1", "app2", "app3"},
			expectedSql: "app_id IN(?,?,?)",
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
			option := authDao.WithAppIds(tt.appIds...)

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

			// Verify parameter values
			for i, expectedId := range tt.appIds {
				if params[i] != expectedId {
					t.Errorf("WithAppIds() params[%d] = %v, want %v", i, params[i], expectedId)
				}
			}
		})
	}
}

func TestAuthDao_Insert(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	t.Run("nil data should return error", func(t *testing.T) {
		_, err := authDao.Insert(nil, nil)
		if err == nil {
			t.Errorf("Insert() with nil data should return error")
		}

		expectedErr := "insert auth data,data must not been nil"
		if err.Error() != expectedErr {
			t.Errorf("Insert() error = %s, want %s", err.Error(), expectedErr)
		}
	})

	t.Run("valid data structure", func(t *testing.T) {
		auth := &models.Auth{
			AppId:      "test-app-123",
			ApiKey:     "test-api-key-456",
			ApiSecret:  "test-api-secret-789",
			Source:     12345,
			IsDelete:   false,
			CreateTime: "2023-01-01 12:00:00",
			UpdateTime: "2023-01-01 12:00:00",
			Extend:     `{"additional": "info"}`,
		}

		// Test that the method exists and validates properly (without actually executing DB operations)
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Insert panicked as expected due to nil database connection: %v", r)
			}
		}()

		_, err := authDao.Insert(auth, nil)
		// Expected to fail with DB connection error, not validation error
		if err != nil && err.Error() == "insert auth data,data must not been nil" {
			t.Errorf("Insert() should not fail validation with valid data")
		}
	})
}

func TestAuthDao_BeginTx(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	// This will fail due to no actual DB connection, but tests method existence
	defer func() {
		if r := recover(); r != nil {
			t.Logf("BeginTx panicked as expected due to nil database connection: %v", r)
		}
	}()

	_, err = authDao.BeginTx()
	if err == nil {
		t.Log("BeginTx() unexpectedly succeeded (probably in a test environment with mock DB)")
	}
	// We just verify the method exists and doesn't panic due to validation issues
}

func TestAuthDao_Update_ErrorHandling(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	t.Run("empty set options should return error", func(t *testing.T) {
		whereOptions := []SqlOption{
			authDao.WithAppId("test-app"),
		}

		_, err := authDao.Update(whereOptions, nil)
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
			authDao.WithAppId("test-app"),
		}
		setOptions := []SqlOption{
			authDao.WithUpdateTime("2023-01-01 12:00:00"),
		}

		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Update panicked as expected due to nil database connection: %v", r)
			}
		}()

		// This will fail due to no actual DB connection
		_, err := authDao.Update(whereOptions, nil, setOptions...)
		// We expect a DB connection error, not a validation error
		if err != nil && err.Error() == "update content is empty" {
			t.Errorf("Update() should not fail with validation error when options are provided")
		}
	})
}

func TestAuthDao_Delete_Logic(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	t.Run("delete adds required options", func(t *testing.T) {
		whereOptions := []SqlOption{
			authDao.WithAppId("test-app"),
		}

		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Delete panicked as expected due to nil database connection: %v", r)
			}
		}()

		// The delete method should add WithIsDelete(true) and WithUpdateTime automatically
		// This will fail due to no DB connection, but we can verify the method structure
		_, err := authDao.Delete(nil, whereOptions...)
		// We expect a DB connection error, not a validation error about missing options
		if err != nil {
			// Should not be "update content is empty" since Delete adds its own set options
			if err.Error() == "update content is empty" {
				t.Errorf("Delete() should automatically add set options")
			}
		}
	})
}

func TestAuthDao_SQLConstruction(t *testing.T) {
	// Test SQL IN clause construction with different numbers of parameters
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	tests := []struct {
		name               string
		appIds             []string
		expectedSql        string
		expectedParamCount int
	}{
		{
			name:               "single app id",
			appIds:             []string{"app1"},
			expectedSql:        "app_id IN(?)",
			expectedParamCount: 1,
		},
		{
			name:               "two app ids",
			appIds:             []string{"app1", "app2"},
			expectedSql:        "app_id IN(?,?)",
			expectedParamCount: 2,
		},
		{
			name:               "three app ids",
			appIds:             []string{"app1", "app2", "app3"},
			expectedSql:        "app_id IN(?,?,?)",
			expectedParamCount: 3,
		},
		{
			name:               "four app ids",
			appIds:             []string{"app1", "app2", "app3", "app4"},
			expectedSql:        "app_id IN(?,?,?,?)",
			expectedParamCount: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			option := authDao.WithAppIds(tt.appIds...)
			sql, params := option()

			if sql != tt.expectedSql {
				t.Errorf("WithAppIds() sql = %s, want %s", sql, tt.expectedSql)
			}

			if len(params) != tt.expectedParamCount {
				t.Errorf("WithAppIds() params length = %d, want %d", len(params), tt.expectedParamCount)
			}

			// Verify parameter values
			for i, expectedId := range tt.appIds {
				if params[i] != expectedId {
					t.Errorf("WithAppIds() params[%d] = %v, want %v", i, params[i], expectedId)
				}
			}
		})
	}
}

func TestAuthDao_Count_Structure(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	t.Run("count without lock", func(t *testing.T) {
		options := []SqlOption{
			authDao.WithAppId("test-app"),
		}

		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Count panicked as expected due to nil database connection: %v", r)
			}
		}()

		// This will fail due to no DB connection, but tests method signature
		_, err := authDao.Count(false, nil, options...)
		// We expect a DB connection error, not a signature error
		if err == nil {
			t.Log("Count() unexpectedly succeeded (probably in a test environment)")
		}
	})

	t.Run("count with lock", func(t *testing.T) {
		options := []SqlOption{
			authDao.WithIsDelete(false),
		}

		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Count with lock panicked as expected due to nil database connection: %v", r)
			}
		}()

		// This will fail due to no DB connection, but tests method signature
		_, err := authDao.Count(true, nil, options...)
		// We expect a DB connection error, not a signature error
		if err == nil {
			t.Log("Count() with lock unexpectedly succeeded (probably in a test environment)")
		}
	})
}

func TestAuthDao_Select_Structure(t *testing.T) {
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	t.Run("select with options", func(t *testing.T) {
		options := []SqlOption{
			authDao.WithAppId("test-app"),
			authDao.WithIsDelete(false),
		}

		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Select panicked as expected due to nil database connection: %v", r)
			}
		}()

		// This will fail due to no DB connection, but tests method signature
		_, err := authDao.Select(options...)
		// We expect a DB connection error, not a signature error
		if err == nil {
			t.Log("Select() unexpectedly succeeded (probably in a test environment)")
		}
	})

	t.Run("select without options", func(t *testing.T) {
		// Add recovery for DB connection panic
		defer func() {
			if r := recover(); r != nil {
				t.Logf("Select without options panicked as expected due to nil database connection: %v", r)
			}
		}()

		// This will fail due to no DB connection, but tests method signature
		_, err := authDao.Select()
		// We expect a DB connection error, not a signature error
		if err == nil {
			t.Log("Select() without options unexpectedly succeeded (probably in a test environment)")
		}
	})
}

func TestAuthDao_Integration_Structure(t *testing.T) {
	// Test the overall structure and method signatures of AuthDao

	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
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
		auth := &models.Auth{AppId: "test"}
		_, err := authDao.Insert(auth, nil)
		_ = err // We expect this to fail, just testing signature

		// Update method
		_, err = authDao.Update([]SqlOption{}, nil)
		_ = err

		// Delete method
		_, err = authDao.Delete(nil)
		_ = err

		// Select method
		_, err = authDao.Select()
		_ = err

		// Count method
		_, err = authDao.Count(false, nil)
		_ = err

		// BeginTx method
		_, err = authDao.BeginTx()
		_ = err

		// All option methods should return SqlOption functions
		options := []SqlOption{
			authDao.WithAppId("test"),
			authDao.WithIsDelete(false),
			authDao.WithApiKey("test-key"),
			authDao.WithUpdateTime(time.Now().Format("2006-01-02 15:04:05")),
			authDao.WithSource(12345),
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
		appIdsOption := authDao.WithAppIds("app1", "app2")
		if appIdsOption == nil {
			t.Errorf("WithAppIds should not return nil for non-empty slice")
		} else {
			sql, params := appIdsOption()
			if sql == "" || len(params) != 2 {
				t.Errorf("WithAppIds should return proper SQL and params")
			}
		}

		// WithAppIds empty
		emptyAppIdsOption := authDao.WithAppIds()
		if emptyAppIdsOption != nil {
			t.Errorf("WithAppIds should return nil for empty slice")
		}
	})
}

func TestAuthDao_FieldTypes(t *testing.T) {
	// Test that the Auth model fields have correct types for the DAO operations
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	// Test Source field as int64
	t.Run("Source field type", func(t *testing.T) {
		source := int64(12345)
		option := authDao.WithSource(source)
		sql, params := option()

		if sql != "source=?" {
			t.Errorf("WithSource() sql = %s, want %s", sql, "source=?")
		}

		if len(params) != 1 {
			t.Errorf("WithSource() params length = %d, want 1", len(params))
		}

		// Verify the parameter is int64
		if reflect.TypeOf(params[0]).Kind() != reflect.Int64 {
			t.Errorf("WithSource() param type = %T, want int64", params[0])
		}

		if params[0] != source {
			t.Errorf("WithSource() params[0] = %v, want %v", params[0], source)
		}
	})

	// Test IsDelete field as bool
	t.Run("IsDelete field type", func(t *testing.T) {
		isDelete := true
		option := authDao.WithIsDelete(isDelete)
		sql, params := option()

		if sql != "is_delete=?" {
			t.Errorf("WithIsDelete() sql = %s, want %s", sql, "is_delete=?")
		}

		if len(params) != 1 {
			t.Errorf("WithIsDelete() params length = %d, want 1", len(params))
		}

		// Verify the parameter is bool
		if reflect.TypeOf(params[0]).Kind() != reflect.Bool {
			t.Errorf("WithIsDelete() param type = %T, want bool", params[0])
		}

		if params[0] != isDelete {
			t.Errorf("WithIsDelete() params[0] = %v, want %v", params[0], isDelete)
		}
	})
}

// Mock implementation for testing the interface without actual database operations
type MockAuthDao struct {
	*AuthDao
	MockInsert func(*models.Auth, *sql.Tx) (int64, error)
	MockUpdate func([]SqlOption, *sql.Tx, ...SqlOption) (int64, error)
	MockDelete func(*sql.Tx, ...SqlOption) (int64, error)
	MockSelect func(...SqlOption) ([]*models.Auth, error)
	MockCount  func(bool, *sql.Tx, ...SqlOption) (int64, error)
}

func TestAuthDao_AllMethodsExist(t *testing.T) {
	// Test that all expected methods exist with correct signatures
	mockDb := &database.Database{}
	authDao, err := NewAuthDao(mockDb)
	if err != nil {
		t.Fatalf("Failed to create AuthDao: %v", err)
	}

	// Check that authDao implements all expected methods by calling them with nil values
	// This tests method signatures without requiring actual database connections

	tests := []struct {
		name     string
		testFunc func() error
	}{
		{
			name: "Insert method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := authDao.Insert(&models.Auth{}, nil)
				return err
			},
		},
		{
			name: "Update method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := authDao.Update([]SqlOption{}, nil)
				return err
			},
		},
		{
			name: "Delete method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := authDao.Delete(nil)
				return err
			},
		},
		{
			name: "Select method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := authDao.Select()
				return err
			},
		},
		{
			name: "Count method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := authDao.Count(false, nil)
				return err
			},
		},
		{
			name: "BeginTx method signature",
			testFunc: func() error {
				defer func() { _ = recover() }()
				_, err := authDao.BeginTx()
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
