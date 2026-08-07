package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestConfig_String(t *testing.T) {
	tests := []struct {
		name     string
		config   *Config
		contains []string
	}{
		{
			name: "complete config",
			config: &Config{
				Server: struct {
					Port     int    `toml:"port"`
					Location string `toml:"location"`
				}{
					Port:     8080,
					Location: "us-west",
				},
				DataBase: struct {
					DBType       string `toml:"dbType"`
					UserName     string `toml:"username"`
					Password     string `toml:"password"`
					Url          string `toml:"url"`
					MaxOpenConns int    `toml:"maxOpenConns"`
					MaxIdleConns int    `toml:"maxIdleConns"`
				}{
					DBType:       "mysql",
					UserName:     "admin",
					Password:     "secret",
					Url:          "localhost:3306",
					MaxOpenConns: 10,
					MaxIdleConns: 5,
				},
				Log: struct {
					LogFile string `toml:"path"`
				}{
					LogFile: "/var/log/app.log",
				},
			},
			contains: []string{"Config{", "Server:", "DataBase:", "Log:", "8080", "mysql", "/var/log/app.log"},
		},
		{
			name:     "empty config",
			config:   &Config{},
			contains: []string{"Config{", "Server:", "DataBase:", "Log:"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.config.String()

			if len(result) == 0 {
				t.Errorf("Config.String() returned empty string")
			}

			for _, expectedContain := range tt.contains {
				if !strings.Contains(result, expectedContain) {
					t.Errorf("Config.String() = %s, should contain %s", result, expectedContain)
				}
			}
		})
	}
}

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name    string
		config  *Config
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid config",
			config: &Config{
				Server: struct {
					Port     int    `toml:"port"`
					Location string `toml:"location"`
				}{
					Port:     8080,
					Location: "us-west",
				},
				DataBase: struct {
					DBType       string `toml:"dbType"`
					UserName     string `toml:"username"`
					Password     string `toml:"password"`
					Url          string `toml:"url"`
					MaxOpenConns int    `toml:"maxOpenConns"`
					MaxIdleConns int    `toml:"maxIdleConns"`
				}{
					DBType:   "mysql",
					UserName: "admin",
					Password: "secret",
					Url:      "localhost:3306",
				},
				Log: struct {
					LogFile string `toml:"path"`
				}{
					LogFile: "/var/log/app.log",
				},
			},
			wantErr: false,
		},
		{
			name:    "missing server port",
			config:  &Config{},
			wantErr: true,
			errMsg:  "server port is required",
		},
		{
			name: "missing database type",
			config: &Config{
				Server: struct {
					Port     int    `toml:"port"`
					Location string `toml:"location"`
				}{
					Port: 8080,
				},
			},
			wantErr: true,
			errMsg:  "database type is required",
		},
		{
			name: "missing database username",
			config: &Config{
				Server: struct {
					Port     int    `toml:"port"`
					Location string `toml:"location"`
				}{
					Port: 8080,
				},
				DataBase: struct {
					DBType       string `toml:"dbType"`
					UserName     string `toml:"username"`
					Password     string `toml:"password"`
					Url          string `toml:"url"`
					MaxOpenConns int    `toml:"maxOpenConns"`
					MaxIdleConns int    `toml:"maxIdleConns"`
				}{
					DBType: "mysql",
				},
			},
			wantErr: true,
			errMsg:  "database username is required",
		},
		{
			name: "missing database password",
			config: &Config{
				Server: struct {
					Port     int    `toml:"port"`
					Location string `toml:"location"`
				}{
					Port: 8080,
				},
				DataBase: struct {
					DBType       string `toml:"dbType"`
					UserName     string `toml:"username"`
					Password     string `toml:"password"`
					Url          string `toml:"url"`
					MaxOpenConns int    `toml:"maxOpenConns"`
					MaxIdleConns int    `toml:"maxIdleConns"`
				}{
					DBType:   "mysql",
					UserName: "admin",
				},
			},
			wantErr: true,
			errMsg:  "database password is required",
		},
		{
			name: "missing database url",
			config: &Config{
				Server: struct {
					Port     int    `toml:"port"`
					Location string `toml:"location"`
				}{
					Port: 8080,
				},
				DataBase: struct {
					DBType       string `toml:"dbType"`
					UserName     string `toml:"username"`
					Password     string `toml:"password"`
					Url          string `toml:"url"`
					MaxOpenConns int    `toml:"maxOpenConns"`
					MaxIdleConns int    `toml:"maxIdleConns"`
				}{
					DBType:   "mysql",
					UserName: "admin",
					Password: "secret",
				},
			},
			wantErr: true,
			errMsg:  "database url is required",
		},
		{
			name: "missing log file",
			config: &Config{
				Server: struct {
					Port     int    `toml:"port"`
					Location string `toml:"location"`
				}{
					Port: 8080,
				},
				DataBase: struct {
					DBType       string `toml:"dbType"`
					UserName     string `toml:"username"`
					Password     string `toml:"password"`
					Url          string `toml:"url"`
					MaxOpenConns int    `toml:"maxOpenConns"`
					MaxIdleConns int    `toml:"maxIdleConns"`
				}{
					DBType:   "mysql",
					UserName: "admin",
					Password: "secret",
					Url:      "localhost:3306",
				},
			},
			wantErr: true,
			errMsg:  "log file is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()

			if (err != nil) != tt.wantErr {
				t.Errorf("Config.Validate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("Config.Validate() error = %s, want %s", err.Error(), tt.errMsg)
			}
		})
	}
}

type loadConfigTestCase struct {
	name       string
	configFile string
	envVars    map[string]string
	wantErr    bool
	validate   func(t *testing.T, cfg *Config)
}

func createValidatorForConfigWithEnvOverride(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		checkLoadConfigField(t, "Server.Port", cfg.Server.Port, 9090)
		checkLoadConfigField(t, "Server.Location", cfg.Server.Location, "us-east")
		checkLoadConfigField(t, "DataBase.DBType", cfg.DataBase.DBType, "mysql")
	}
}

func createValidatorForEnvOnlyConfig(t *testing.T) func(t *testing.T, cfg *Config) {
	return func(t *testing.T, cfg *Config) {
		checkLoadConfigField(t, "Server.Port", cfg.Server.Port, 8080)
		checkLoadConfigField(t, "DataBase.DBType", cfg.DataBase.DBType, "postgresql")
		checkLoadConfigField(t, "DataBase.MaxOpenConns", cfg.DataBase.MaxOpenConns, 20)
	}
}

func checkLoadConfigField(t *testing.T, fieldName string, actual, expected interface{}) {
	if actual != expected {
		t.Errorf("Expected %s %v, got %v", fieldName, expected, actual)
	}
}

func setupTestEnvironment(envVars map[string]string) (func(), map[string]string) {
	originalEnv := make(map[string]string)
	for key, value := range envVars {
		originalEnv[key] = os.Getenv(key)
		_ = os.Setenv(key, value)
	}

	cleanup := func() {
		for key := range envVars {
			if originalVal, exists := originalEnv[key]; exists {
				_ = os.Setenv(key, originalVal)
			} else {
				_ = os.Unsetenv(key)
			}
		}
	}

	return cleanup, originalEnv
}

func TestLoadConfig(t *testing.T) {
	tempDir := t.TempDir()

	tests := []loadConfigTestCase{
		{
			name: "valid config file with env override",
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
			envVars: map[string]string{
				"SERVICE_PORT": "9090",
			},
			wantErr:  false,
			validate: createValidatorForConfigWithEnvOverride(t),
		},
		{
			name: "invalid config - missing required fields",
			configFile: `
[service]
port = 8080

[database]
dbType = "mysql"

[log]
`,
			wantErr: true,
		},
		{
			name: "env only config",
			configFile: `# Empty config file
`,
			envVars: map[string]string{
				"SERVICE_PORT":            "8080",
				"SERVICE_LOCATION":        "us-west",
				"DATABASE_DB_TYPE":        "postgresql",
				"DATABASE_USERNAME":       "envuser",
				"DATABASE_PASSWORD":       "envpass",
				"DATABASE_URL":            "env.example.com:5432/envdb",
				"DATABASE_MAX_OPEN_CONNS": "20",
				"DATABASE_MAX_IDLE_CONNS": "10",
				"LOG_PATH":                "/env/log/path.log",
			},
			wantErr:  false,
			validate: createValidatorForEnvOnlyConfig(t),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			configPath := filepath.Join(tempDir, "config.toml")
			err := os.WriteFile(configPath, []byte(tt.configFile), 0o644)
			if err != nil {
				t.Fatalf("Failed to write test config file: %v", err)
			}

			cleanup, _ := setupTestEnvironment(tt.envVars)
			defer cleanup()

			cfg, err := LoadConfig(configPath)

			if (err != nil) != tt.wantErr {
				t.Errorf("LoadConfig() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if cfg == nil {
					t.Errorf("LoadConfig() returned nil config when no error expected")
					return
				}

				if tt.validate != nil {
					tt.validate(t, cfg)
				}
			}
		})
	}
}

func TestLoadConfig_FileNotFound(t *testing.T) {
	// Test with non-existent file (should still work with env vars if they satisfy validation)
	nonExistentPath := "/path/that/does/not/exist/config.toml"

	// Set minimum required env vars for validation to pass
	envVars := map[string]string{
		"SERVICE_PORT":      "8080",
		"DATABASE_DB_TYPE":  "mysql",
		"DATABASE_USERNAME": "user",
		"DATABASE_PASSWORD": "pass",
		"DATABASE_URL":      "localhost:3306",
		"LOG_PATH":          "/tmp/test.log",
	}

	// Set environment variables
	for key, value := range envVars {
		_ = os.Setenv(key, value)
	}

	// Cleanup
	defer func() {
		for key := range envVars {
			_ = os.Unsetenv(key)
		}
	}()

	cfg, err := LoadConfig(nonExistentPath)
	// Should not error if env vars provide all required config
	if err != nil {
		t.Errorf("LoadConfig() with non-existent file but valid env vars should not error: %v", err)
	}

	if cfg == nil {
		t.Errorf("LoadConfig() should return valid config from env vars")
	}
}
