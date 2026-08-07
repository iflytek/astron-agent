package config

import (
	"os"
	"testing"
)

func TestNewEnvLoader(t *testing.T) {
	loader := NewEnvLoader()

	if loader == nil {
		t.Errorf("NewEnvLoader() returned nil")
	}

	// Test that it creates an empty struct (no fields to validate)
	if loader == nil {
		t.Errorf("NewEnvLoader() should return non-nil EnvLoader")
	}
}

type envTestCase struct {
	name     string
	envVars  map[string]string
	wantErr  bool
	validate func(t *testing.T, cfg *Config)
}

func createValidatorForAllEnvVars(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		expectations := map[string]interface{}{
			"Server.Port":           8080,
			"Server.Location":       "us-west",
			"DataBase.DBType":       "mysql",
			"DataBase.UserName":     "envuser",
			"DataBase.Password":     "envpass",
			"DataBase.Url":          "localhost:3306/envdb",
			"DataBase.MaxOpenConns": 15,
			"DataBase.MaxIdleConns": 8,
			"Log.LogFile":           "/var/log/env.log",
		}

		checkField(t, "Server.Port", cfg.Server.Port, expectations["Server.Port"])
		checkField(t, "Server.Location", cfg.Server.Location, expectations["Server.Location"])
		checkField(t, "DataBase.DBType", cfg.DataBase.DBType, expectations["DataBase.DBType"])
		checkField(t, "DataBase.UserName", cfg.DataBase.UserName, expectations["DataBase.UserName"])
		checkField(t, "DataBase.Password", cfg.DataBase.Password, expectations["DataBase.Password"])
		checkField(t, "DataBase.Url", cfg.DataBase.Url, expectations["DataBase.Url"])
		checkField(t, "DataBase.MaxOpenConns", cfg.DataBase.MaxOpenConns, expectations["DataBase.MaxOpenConns"])
		checkField(t, "DataBase.MaxIdleConns", cfg.DataBase.MaxIdleConns, expectations["DataBase.MaxIdleConns"])
		checkField(t, "Log.LogFile", cfg.Log.LogFile, expectations["Log.LogFile"])
	}
}

func createValidatorForNoEnvVars(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		checkField(t, "Server.Port", cfg.Server.Port, 0)
		checkField(t, "Server.Location", cfg.Server.Location, "")
		checkField(t, "DataBase.DBType", cfg.DataBase.DBType, "")
	}
}

func createValidatorForPartialEnvVars(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		checkField(t, "Server.Port", cfg.Server.Port, 9090)
		checkField(t, "DataBase.DBType", cfg.DataBase.DBType, "postgresql")
		checkField(t, "Log.LogFile", cfg.Log.LogFile, "/tmp/partial.log")
		checkField(t, "Server.Location", cfg.Server.Location, "")
		checkField(t, "DataBase.UserName", cfg.DataBase.UserName, "")
	}
}

func createValidatorForEmptyEnvVars(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		checkField(t, "Server.Port", cfg.Server.Port, 0)
		checkField(t, "Server.Location", cfg.Server.Location, "")
		checkField(t, "DataBase.DBType", cfg.DataBase.DBType, "")
	}
}

func checkField(t *testing.T, fieldName string, actual, expected interface{}) {
	if actual != expected {
		t.Errorf("Expected %s %v, got %v", fieldName, expected, actual)
	}
}

func setupEnvironment(envVars map[string]string) (func(), []string) {
	envKeys := []string{
		"SERVICE_PORT", "SERVICE_LOCATION",
		"DATABASE_DB_TYPE", "DATABASE_USERNAME", "DATABASE_PASSWORD",
		"DATABASE_URL", "DATABASE_MAX_OPEN_CONNS", "DATABASE_MAX_IDLE_CONNS",
		"LOG_PATH",
	}

	originalEnv := make(map[string]string)
	for _, key := range envKeys {
		originalEnv[key] = os.Getenv(key)
		_ = os.Unsetenv(key)
	}

	for key, value := range envVars {
		_ = os.Setenv(key, value)
	}

	cleanup := func() {
		for _, key := range envKeys {
			if originalVal, exists := originalEnv[key]; exists {
				_ = os.Setenv(key, originalVal)
			} else {
				_ = os.Unsetenv(key)
			}
		}
	}

	return cleanup, envKeys
}

func TestEnvLoader_Load(t *testing.T) {
	tests := []envTestCase{
		{
			name: "all environment variables set",
			envVars: map[string]string{
				"SERVICE_PORT":            "8080",
				"SERVICE_LOCATION":        "us-west",
				"DATABASE_DB_TYPE":        "mysql",
				"DATABASE_USERNAME":       "envuser",
				"DATABASE_PASSWORD":       "envpass",
				"DATABASE_URL":            "localhost:3306/envdb",
				"DATABASE_MAX_OPEN_CONNS": "15",
				"DATABASE_MAX_IDLE_CONNS": "8",
				"LOG_PATH":                "/var/log/env.log",
			},
			wantErr:  false,
			validate: createValidatorForAllEnvVars(t),
		},
		{
			name:     "no environment variables set",
			envVars:  map[string]string{},
			wantErr:  false,
			validate: createValidatorForNoEnvVars(t),
		},
		{
			name: "partial environment variables set",
			envVars: map[string]string{
				"SERVICE_PORT":     "9090",
				"DATABASE_DB_TYPE": "postgresql",
				"LOG_PATH":         "/tmp/partial.log",
			},
			wantErr:  false,
			validate: createValidatorForPartialEnvVars(t),
		},
		{
			name: "invalid SERVICE_PORT",
			envVars: map[string]string{
				"SERVICE_PORT": "invalid_port",
			},
			wantErr: true,
		},
		{
			name: "invalid DATABASE_MAX_OPEN_CONNS",
			envVars: map[string]string{
				"DATABASE_MAX_OPEN_CONNS": "not_a_number",
			},
			wantErr: true,
		},
		{
			name: "invalid DATABASE_MAX_IDLE_CONNS",
			envVars: map[string]string{
				"DATABASE_MAX_IDLE_CONNS": "also_not_a_number",
			},
			wantErr: true,
		},
		{
			name: "empty string environment variables",
			envVars: map[string]string{
				"SERVICE_PORT":     "",
				"SERVICE_LOCATION": "",
				"DATABASE_DB_TYPE": "",
			},
			wantErr:  false,
			validate: createValidatorForEmptyEnvVars(t),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cleanup, _ := setupEnvironment(tt.envVars)
			defer cleanup()

			loader := NewEnvLoader()
			cfg := &Config{}
			err := loader.Load(cfg)

			if (err != nil) != tt.wantErr {
				t.Errorf("EnvLoader.Load() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && tt.validate != nil {
				tt.validate(t, cfg)
			}
		})
	}
}

func TestEnvLoader_Load_IntegerParsing(t *testing.T) {
	tests := []struct {
		name    string
		envVar  string
		value   string
		wantErr bool
	}{
		{
			name:    "valid integer SERVICE_PORT",
			envVar:  "SERVICE_PORT",
			value:   "8080",
			wantErr: false,
		},
		{
			name:    "zero SERVICE_PORT",
			envVar:  "SERVICE_PORT",
			value:   "0",
			wantErr: false,
		},
		{
			name:    "negative SERVICE_PORT",
			envVar:  "SERVICE_PORT",
			value:   "-1",
			wantErr: false,
		},
		{
			name:    "invalid SERVICE_PORT",
			envVar:  "SERVICE_PORT",
			value:   "abc",
			wantErr: true,
		},
		{
			name:    "float SERVICE_PORT",
			envVar:  "SERVICE_PORT",
			value:   "8080.5",
			wantErr: false, // fmt.Sscanf with %d will parse "8080.5" as 8080 (truncates)
		},
		{
			name:    "valid DATABASE_MAX_OPEN_CONNS",
			envVar:  "DATABASE_MAX_OPEN_CONNS",
			value:   "10",
			wantErr: false,
		},
		{
			name:    "invalid DATABASE_MAX_OPEN_CONNS",
			envVar:  "DATABASE_MAX_OPEN_CONNS",
			value:   "invalid",
			wantErr: true,
		},
		{
			name:    "valid DATABASE_MAX_IDLE_CONNS",
			envVar:  "DATABASE_MAX_IDLE_CONNS",
			value:   "5",
			wantErr: false,
		},
		{
			name:    "invalid DATABASE_MAX_IDLE_CONNS",
			envVar:  "DATABASE_MAX_IDLE_CONNS",
			value:   "not_number",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clear all environment variables first
			envKeys := []string{
				"SERVICE_PORT", "DATABASE_MAX_OPEN_CONNS", "DATABASE_MAX_IDLE_CONNS",
			}
			originalEnv := make(map[string]string)
			for _, key := range envKeys {
				originalEnv[key] = os.Getenv(key)
				_ = os.Unsetenv(key)
			}

			// Set the specific test environment variable
			_ = os.Setenv(tt.envVar, tt.value)

			// Cleanup
			defer func() {
				for _, key := range envKeys {
					if originalVal, exists := originalEnv[key]; exists {
						_ = os.Setenv(key, originalVal)
					} else {
						_ = os.Unsetenv(key)
					}
				}
			}()

			loader := NewEnvLoader()
			cfg := &Config{}
			err := loader.Load(cfg)

			if (err != nil) != tt.wantErr {
				t.Errorf("EnvLoader.Load() with %s=%s, error = %v, wantErr %v", tt.envVar, tt.value, err, tt.wantErr)
			}
		})
	}
}

func TestEnvLoader_Watch(t *testing.T) {
	// Test the Watch method (currently empty implementation)
	loader := NewEnvLoader()
	cfg := &Config{}

	callbackCalled := false
	onChange := func() {
		callbackCalled = true
	}

	// This should not panic or error, even though it's a no-op
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("EnvLoader.Watch() should not panic: %v", r)
		}
	}()

	loader.Watch(cfg, onChange)

	// Since it's a no-op, callback should not be called
	if callbackCalled {
		t.Errorf("EnvLoader.Watch() callback should not be called in current implementation")
	}
}

func TestEnvLoader_Interface(t *testing.T) {
	// Test that EnvLoader implements ConfLoader interface
	var _ ConfLoader = &EnvLoader{}

	loader := NewEnvLoader()

	// Test that we can call interface methods
	cfg := &Config{}

	// Load method
	err := loader.Load(cfg)
	if err != nil {
		t.Errorf("EnvLoader.Load() should not error with clean environment: %v", err)
	}

	// Watch method
	loader.Watch(cfg, func() {})
	// No error expected since it's a no-op
}

func TestEnvLoader_LoadPreservesExistingConfig(t *testing.T) {
	// Test that Load only overrides values that have corresponding env vars

	// Pre-populate config with values
	cfg := &Config{}
	cfg.Server.Port = 3000
	cfg.Server.Location = "original-location"
	cfg.DataBase.DBType = "original-db"
	cfg.Log.LogFile = "original.log"

	// Set only one environment variable
	originalPort := os.Getenv("SERVICE_PORT")
	_ = os.Setenv("SERVICE_PORT", "8080")
	defer func() {
		if originalPort != "" {
			_ = os.Setenv("SERVICE_PORT", originalPort)
		} else {
			_ = os.Unsetenv("SERVICE_PORT")
		}
	}()

	loader := NewEnvLoader()
	err := loader.Load(cfg)
	if err != nil {
		t.Errorf("EnvLoader.Load() should not error: %v", err)
	}

	// Port should be overridden by env var
	if cfg.Server.Port != 8080 {
		t.Errorf("Expected port to be overridden to 8080, got %d", cfg.Server.Port)
	}

	// Other values should remain unchanged (since no env vars set for them)
	if cfg.Server.Location != "original-location" {
		t.Errorf("Expected location to remain 'original-location', got %s", cfg.Server.Location)
	}
	if cfg.DataBase.DBType != "original-db" {
		t.Errorf("Expected dbType to remain 'original-db', got %s", cfg.DataBase.DBType)
	}
	if cfg.Log.LogFile != "original.log" {
		t.Errorf("Expected log file to remain 'original.log', got %s", cfg.Log.LogFile)
	}
}
