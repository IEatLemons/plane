package config

import (
	"fmt"
	"os"
	"time"

	"github.com/caarlos0/env/v9"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type Config struct {
	// HTTP
	Host string `env:"API_GO_HOST" envDefault:"0.0.0.0"`
	Port int    `env:"API_GO_PORT" envDefault:"8001"`

	// Database
	PostgresDSN string `env:"API_GO_POSTGRES_DSN"`
	// 兼容 Django 的 DATABASE_URL，若上面没配则回退使用它
	DatabaseURL string `env:"DATABASE_URL"`

	// Redis
	RedisAddr     string `env:"API_GO_REDIS_ADDR" envDefault:"localhost:6379"`
	RedisPassword string `env:"API_GO_REDIS_PASSWORD"`
	RedisDB       int    `env:"API_GO_REDIS_DB" envDefault:"0"`

	// Logging
	LogLevel string `env:"API_GO_LOG_LEVEL" envDefault:"info"`
}

func (c Config) HTTPAddr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func Load() (*Config, error) {
	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return nil, err
	}

	// 支持 .env 中使用 ${VAR} 的写法（例如 DATABASE_URL / API_GO_POSTGRES_DSN）
	cfg.PostgresDSN = os.ExpandEnv(cfg.PostgresDSN)
	cfg.DatabaseURL = os.ExpandEnv(cfg.DatabaseURL)

	// 若未显式配置 API_GO_POSTGRES_DSN，则复用 DATABASE_URL
	if cfg.PostgresDSN == "" && cfg.DatabaseURL != "" {
		cfg.PostgresDSN = cfg.DatabaseURL
	}

	return &cfg, nil
}

func NewLogger(cfg *Config) (*zap.Logger, error) {
	config := zap.NewProductionConfig()
	config.Level = zap.NewAtomicLevelAt(parseLevel(cfg.LogLevel))
	config.EncoderConfig.TimeKey = "ts"
	config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout(time.RFC3339Nano)
	return config.Build()
}

func parseLevel(level string) zapcore.Level {
	switch level {
	case "debug":
		return zapcore.DebugLevel
	case "warn":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	default:
		return zapcore.InfoLevel
	}
}

