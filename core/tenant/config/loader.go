package config

type ConfLoader interface {
	Load(cfg *Config) error             // load config
	Watch(cfg *Config, onChange func()) // watch config change
}
