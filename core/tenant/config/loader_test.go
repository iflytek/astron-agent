package config

import (
	"testing"
)

// MockLoader implements ConfLoader interface for testing
type MockLoader struct {
	LoadFunc  func(cfg *Config) error
	WatchFunc func(cfg *Config, onChange func())
}

func (m *MockLoader) Load(cfg *Config) error {
	if m.LoadFunc != nil {
		return m.LoadFunc(cfg)
	}
	return nil
}

func (m *MockLoader) Watch(cfg *Config, onChange func()) {
	if m.WatchFunc != nil {
		m.WatchFunc(cfg, onChange)
	}
}

func TestConfLoader_Interface(t *testing.T) {
	// Test that the interface is properly defined and can be implemented

	tests := []struct {
		name   string
		loader ConfLoader
	}{
		{
			name:   "LocalLoader implements ConfLoader",
			loader: NewLocalLoader("test.toml"),
		},
		{
			name:   "EnvLoader implements ConfLoader",
			loader: NewEnvLoader(),
		},
		{
			name:   "MockLoader implements ConfLoader",
			loader: &MockLoader{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test that the loader implements the interface
			_ = tt.loader

			// Test that interface methods can be called
			cfg := &Config{}

			// Test Load method
			err := tt.loader.Load(cfg)
			// We don't care about the result, just that the method is callable
			// Different implementations may succeed or fail
			_ = err

			// Test Watch method
			onChange := func() {
				// Callback function for testing
			}

			tt.loader.Watch(cfg, onChange)
			// We don't check if callback was called since it depends on implementation
		})
	}
}

func TestConfLoader_Methods(t *testing.T) {
	// Test that the interface methods have correct signatures

	t.Run("Load method signature", func(t *testing.T) {
		loader := &MockLoader{
			LoadFunc: func(cfg *Config) error {
				// Test that we receive a Config pointer
				if cfg == nil {
					t.Errorf("Load method should receive non-nil Config pointer")
					return nil
				}

				// Test that we can modify the config
				cfg.Server.Port = 9999
				return nil
			},
		}

		cfg := &Config{}
		err := loader.Load(cfg)
		if err != nil {
			t.Errorf("MockLoader.Load() should not return error: %v", err)
		}

		if cfg.Server.Port != 9999 {
			t.Errorf("Load method should be able to modify config, port = %d, want 9999", cfg.Server.Port)
		}
	})

	t.Run("Watch method signature", func(t *testing.T) {
		callbackCalled := false
		loader := &MockLoader{
			WatchFunc: func(cfg *Config, onChange func()) {
				// Test that we receive a Config pointer and a callback function
				if cfg == nil {
					t.Errorf("Watch method should receive non-nil Config pointer")
				}

				if onChange == nil {
					t.Errorf("Watch method should receive non-nil callback function")
				}

				// Test that we can call the callback
				onChange()
			},
		}

		cfg := &Config{}
		onChange := func() {
			callbackCalled = true
		}

		loader.Watch(cfg, onChange)

		if !callbackCalled {
			t.Errorf("Watch method should call the onChange callback")
		}
	})
}

func TestConfLoader_LoadErrorHandling(t *testing.T) {
	// Test that Load method can return errors

	tests := []struct {
		name        string
		loader      ConfLoader
		expectError bool
	}{
		{
			name: "MockLoader with error",
			loader: &MockLoader{
				LoadFunc: func(cfg *Config) error {
					return &ConfigError{Msg: "test error"}
				},
			},
			expectError: true,
		},
		{
			name: "MockLoader without error",
			loader: &MockLoader{
				LoadFunc: func(cfg *Config) error {
					return nil
				},
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := &Config{}
			err := tt.loader.Load(cfg)

			if tt.expectError && err == nil {
				t.Errorf("Expected error but got nil")
			}

			if !tt.expectError && err != nil {
				t.Errorf("Expected no error but got: %v", err)
			}
		})
	}
}

func TestConfLoader_MultipleImplementations(t *testing.T) {
	// Test that multiple loaders can be used together

	loaders := []ConfLoader{
		NewLocalLoader("test1.toml"),
		NewEnvLoader(),
		&MockLoader{
			LoadFunc: func(cfg *Config) error {
				cfg.Server.Port = 7777
				return nil
			},
		},
	}

	cfg := &Config{}

	// Apply all loaders
	for i, loader := range loaders {
		err := loader.Load(cfg)
		// We don't check for errors since some loaders might fail (e.g., missing files)
		// We just verify that the interface works
		t.Logf("Loader %d completed with error: %v", i, err)
	}

	// Test that Watch can be called on all loaders
	onChange := func() {
		t.Log("Config changed")
	}

	for i, loader := range loaders {
		loader.Watch(cfg, onChange)
		t.Logf("Watch set up for loader %d", i)
	}
}

// ConfigError is a custom error type for testing
type ConfigError struct {
	Msg string
}

func (e *ConfigError) Error() string {
	return e.Msg
}

func TestConfLoader_InterfaceDocumentation(t *testing.T) {
	// Test that the interface methods behave as documented

	t.Run("Load method modifies config", func(t *testing.T) {
		loader := &MockLoader{
			LoadFunc: func(cfg *Config) error {
				// Simulate loading configuration values
				cfg.Server.Port = 8080
				cfg.Server.Location = "test-location"
				cfg.DataBase.DBType = "test-db"
				cfg.DataBase.UserName = "test-user"
				cfg.DataBase.Password = "test-pass"
				cfg.DataBase.Url = "test-url"
				cfg.Log.LogFile = "test.log"
				return nil
			},
		}

		cfg := &Config{}
		err := loader.Load(cfg)
		if err != nil {
			t.Errorf("Load should not return error: %v", err)
		}

		// Verify that config was loaded
		if cfg.Server.Port != 8080 {
			t.Errorf("Load should set server port, got %d", cfg.Server.Port)
		}
		if cfg.DataBase.DBType != "test-db" {
			t.Errorf("Load should set database type, got %s", cfg.DataBase.DBType)
		}
		if cfg.Log.LogFile != "test.log" {
			t.Errorf("Load should set log file, got %s", cfg.Log.LogFile)
		}
	})

	t.Run("Watch method sets up change monitoring", func(t *testing.T) {
		watchCalled := false
		onChangeCalled := false

		loader := &MockLoader{
			WatchFunc: func(cfg *Config, onChange func()) {
				watchCalled = true
				// Simulate a config change
				onChange()
			},
		}

		cfg := &Config{}
		onChange := func() {
			onChangeCalled = true
		}

		loader.Watch(cfg, onChange)

		if !watchCalled {
			t.Errorf("Watch method should be called")
		}
		if !onChangeCalled {
			t.Errorf("onChange callback should be called when config changes")
		}
	})
}
