package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewLocalLoader(t *testing.T) {
	tests := []struct {
		name         string
		path         string
		expectedPath string
	}{
		{
			name:         "with custom path",
			path:         "/custom/path/config.toml",
			expectedPath: "/custom/path/config.toml",
		},
		{
			name:         "with empty path",
			path:         "",
			expectedPath: "./config.toml",
		},
		{
			name:         "with relative path",
			path:         "configs/app.toml",
			expectedPath: "configs/app.toml",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			loader := NewLocalLoader(tt.path)

			if loader == nil {
				t.Errorf("NewLocalLoader() returned nil")
				return
			}

			if loader.Path != tt.expectedPath {
				t.Errorf("NewLocalLoader() path = %s, want %s", loader.Path, tt.expectedPath)
			}
		})
	}
}

type localTestCase struct {
	name       string
	configFile string
	wantErr    bool
	validate   func(t *testing.T, cfg *Config)
}

func createValidatorForValidTOML(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		expectations := map[string]interface{}{
			"Server.Port":           8080,
			"Server.Location":       "us-east",
			"DataBase.DBType":       "mysql",
			"DataBase.UserName":     "testuser",
			"DataBase.Password":     "testpass",
			"DataBase.Url":          "localhost:3306/testdb",
			"DataBase.MaxOpenConns": 10,
			"DataBase.MaxIdleConns": 5,
			"Log.LogFile":           "/tmp/test.log",
		}

		checkConfigField(t, "Server.Port", cfg.Server.Port, expectations["Server.Port"])
		checkConfigField(t, "Server.Location", cfg.Server.Location, expectations["Server.Location"])
		checkConfigField(t, "DataBase.DBType", cfg.DataBase.DBType, expectations["DataBase.DBType"])
		checkConfigField(t, "DataBase.UserName", cfg.DataBase.UserName, expectations["DataBase.UserName"])
		checkConfigField(t, "DataBase.Password", cfg.DataBase.Password, expectations["DataBase.Password"])
		checkConfigField(t, "DataBase.Url", cfg.DataBase.Url, expectations["DataBase.Url"])
		checkConfigField(t, "DataBase.MaxOpenConns", cfg.DataBase.MaxOpenConns, expectations["DataBase.MaxOpenConns"])
		checkConfigField(t, "DataBase.MaxIdleConns", cfg.DataBase.MaxIdleConns, expectations["DataBase.MaxIdleConns"])
		checkConfigField(t, "Log.LogFile", cfg.Log.LogFile, expectations["Log.LogFile"])
	}
}

func createValidatorForPartialTOML(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		checkConfigField(t, "Server.Port", cfg.Server.Port, 9090)
		checkConfigField(t, "Server.Location", cfg.Server.Location, "")
		checkConfigField(t, "DataBase.DBType", cfg.DataBase.DBType, "postgresql")
		checkConfigField(t, "DataBase.UserName", cfg.DataBase.UserName, "partialuser")
		checkConfigField(t, "DataBase.Password", cfg.DataBase.Password, "")
		checkConfigField(t, "DataBase.MaxOpenConns", cfg.DataBase.MaxOpenConns, 0)
	}
}

func createValidatorForEmptyTOML(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		checkConfigField(t, "Server.Port", cfg.Server.Port, 0)
		checkConfigField(t, "DataBase.DBType", cfg.DataBase.DBType, "")
	}
}

func checkConfigField(t *testing.T, fieldName string, actual, expected interface{}) {
	if actual != expected {
		t.Errorf("Expected %s %v, got %v", fieldName, expected, actual)
	}
}

func TestLocalLoader_Load(t *testing.T) {
	tempDir := t.TempDir()

	tests := []localTestCase{
		{
			name: "valid TOML config",
			configFile: `
[service]
port = 8080
location = "us-east"

[database]
dbType = "mysql"
username = "testuser"
password = "testpass"
url = "localhost:3306/testdb"
maxOpenConns = 10
maxIdleConns = 5

[log]
path = "/tmp/test.log"
`,
			wantErr:  false,
			validate: createValidatorForValidTOML(t),
		},
		{
			name: "partial TOML config",
			configFile: `
[service]
port = 9090

[database]
dbType = "postgresql"
username = "partialuser"
`,
			wantErr:  false,
			validate: createValidatorForPartialTOML(t),
		},
		{
			name: "empty TOML config",
			configFile: `# Empty config file
`,
			wantErr:  false,
			validate: createValidatorForEmptyTOML(t),
		},
		{
			name: "invalid TOML syntax",
			configFile: `
[service
port = 8080  # Missing closing bracket
location = "invalid
`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configPath := filepath.Join(tempDir, "test_config.toml")
			err := os.WriteFile(configPath, []byte(tt.configFile), 0o644)
			if err != nil {
				t.Fatalf("Failed to write test config file: %v", err)
			}

			loader := NewLocalLoader(configPath)
			cfg := &Config{}
			err = loader.Load(cfg)

			if (err != nil) != tt.wantErr {
				t.Errorf("LocalLoader.Load() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr && tt.validate != nil {
				tt.validate(t, cfg)
			}
		})
	}
}

func TestLocalLoader_Load_FileNotFound(t *testing.T) {
	loader := NewLocalLoader("/path/that/does/not/exist.toml")
	cfg := &Config{}

	err := loader.Load(cfg)

	if err == nil {
		t.Errorf("LocalLoader.Load() with non-existent file should return error")
	}
}

func TestLocalLoader_Load_PermissionDenied(t *testing.T) {
	// Create a temporary file with restricted permissions
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "restricted_config.toml")

	// Write config file
	err := os.WriteFile(configPath, []byte(`[service]\nport = 8080`), 0o644)
	if err != nil {
		t.Fatalf("Failed to write test config file: %v", err)
	}

	// Remove read permissions (this may not work on all systems)
	err = os.Chmod(configPath, 0o000)
	if err != nil {
		t.Skipf("Cannot change file permissions on this system: %v", err)
	}

	// Restore permissions for cleanup
	defer func() { _ = os.Chmod(configPath, 0o644) }()

	loader := NewLocalLoader(configPath)
	cfg := &Config{}

	err = loader.Load(cfg)

	if err == nil {
		t.Errorf("LocalLoader.Load() with permission denied file should return error")
	}
}

func TestLocalLoader_Watch(t *testing.T) {
	// Test the Watch method (currently empty implementation)
	loader := NewLocalLoader("test.toml")
	cfg := &Config{}

	callbackCalled := false
	onChange := func() {
		callbackCalled = true
	}

	// This should not panic or error, even though it's a no-op
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("LocalLoader.Watch() should not panic: %v", r)
		}
	}()

	loader.Watch(cfg, onChange)

	// Since it's a no-op, callback should not be called
	if callbackCalled {
		t.Errorf("LocalLoader.Watch() callback should not be called in current implementation")
	}
}

func TestLocalLoader_Interface(t *testing.T) {
	// Test that LocalLoader implements ConfLoader interface
	var _ ConfLoader = &LocalLoader{}

	loader := NewLocalLoader("test.toml")

	// Test that we can call interface methods
	cfg := &Config{}

	// Load method
	err := loader.Load(cfg)
	// Error is expected since file doesn't exist, but method should be callable
	if err == nil {
		t.Log("Load method succeeded unexpectedly (file might exist)")
	}

	// Watch method
	loader.Watch(cfg, func() {})
	// No error expected since it's a no-op
}

func TestLocalLoader_DefaultPath(t *testing.T) {
	// Test that default path is used when empty string is provided
	loader := NewLocalLoader("")

	expectedDefaultPath := "./config.toml"
	if loader.Path != expectedDefaultPath {
		t.Errorf("NewLocalLoader(\"\") should use default path %s, got %s", expectedDefaultPath, loader.Path)
	}
}

func TestLocalLoader_StructFields(t *testing.T) {
	// Test LocalLoader struct fields
	testPath := "/test/path/config.toml"
	loader := &LocalLoader{Path: testPath}

	if loader.Path != testPath {
		t.Errorf("LocalLoader.Path = %s, want %s", loader.Path, testPath)
	}

	// Test that Path field is accessible and modifiable
	newPath := "/new/path/config.toml"
	loader.Path = newPath

	if loader.Path != newPath {
		t.Errorf("After modification, LocalLoader.Path = %s, want %s", loader.Path, newPath)
	}
}
