package config

import (
	"fmt"
	"os"
)

type EnvLoader struct{}

func NewEnvLoader() *EnvLoader {
	return &EnvLoader{}
}

type envMapping struct {
	envKey   string
	setValue func(*Config, string) error
}

func (l *EnvLoader) Load(cfg *Config) error {
	mappings := []envMapping{
		{"SERVICE_PORT", l.setServicePort},
		{"SERVICE_LOCATION", l.setServiceLocation},
		{"DATABASE_DB_TYPE", l.setDatabaseDBType},
		{"DATABASE_USERNAME", l.setDatabaseUsername},
		{"DATABASE_PASSWORD", l.setDatabasePassword},
		{"DATABASE_URL", l.setDatabaseURL},
		{"DATABASE_MAX_OPEN_CONNS", l.setDatabaseMaxOpenConns},
		{"DATABASE_MAX_IDLE_CONNS", l.setDatabaseMaxIdleConns},
		{"LOG_PATH", l.setLogPath},
	}

	for _, mapping := range mappings {
		if value := os.Getenv(mapping.envKey); value != "" {
			if err := mapping.setValue(cfg, value); err != nil {
				return err
			}
		}
	}

	return nil
}

func (l *EnvLoader) setServicePort(cfg *Config, value string) error {
	if n, err := fmt.Sscanf(value, "%d", &cfg.Server.Port); err != nil || n != 1 {
		return fmt.Errorf("invalid SERVICE_PORT: %v", err)
	}
	return nil
}

func (l *EnvLoader) setServiceLocation(cfg *Config, value string) error {
	cfg.Server.Location = value
	return nil
}

func (l *EnvLoader) setDatabaseDBType(cfg *Config, value string) error {
	cfg.DataBase.DBType = value
	return nil
}

func (l *EnvLoader) setDatabaseUsername(cfg *Config, value string) error {
	cfg.DataBase.UserName = value
	return nil
}

func (l *EnvLoader) setDatabasePassword(cfg *Config, value string) error {
	cfg.DataBase.Password = value
	return nil
}

func (l *EnvLoader) setDatabaseURL(cfg *Config, value string) error {
	cfg.DataBase.Url = value
	return nil
}

func (l *EnvLoader) setDatabaseMaxOpenConns(cfg *Config, value string) error {
	if n, err := fmt.Sscanf(value, "%d", &cfg.DataBase.MaxOpenConns); err != nil || n != 1 {
		return fmt.Errorf("invalid DATABASE_MAX_OPEN_CONNS: %v", err)
	}
	return nil
}

func (l *EnvLoader) setDatabaseMaxIdleConns(cfg *Config, value string) error {
	if n, err := fmt.Sscanf(value, "%d", &cfg.DataBase.MaxIdleConns); err != nil || n != 1 {
		return fmt.Errorf("invalid DATABASE_MAX_IDLE_CONNS: %v", err)
	}
	return nil
}

func (l *EnvLoader) setLogPath(cfg *Config, value string) error {
	cfg.Log.LogFile = value
	return nil
}

func (l *EnvLoader) Watch(cfg *Config, onChange func()) {
}
