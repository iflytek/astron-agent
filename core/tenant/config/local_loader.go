package config

import "github.com/BurntSushi/toml"

type LocalLoader struct {
	Path string
}

func NewLocalLoader(path string) *LocalLoader {
	if len(path) == 0 {
		path = "./config.toml"
	}
	return &LocalLoader{Path: path}
}

func (l *LocalLoader) Load(cfg *Config) error {
	if _, err := toml.DecodeFile(l.Path, cfg); err != nil {
		return err
	}
	return nil
}

func (l *LocalLoader) Watch(cfg *Config, onChange func()) {
}
