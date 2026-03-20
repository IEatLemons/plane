package repository

import (
	"context"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/makeplane/plane/apps/api-go/internal/config"
)

func NewDB(cfg *config.Config, log *zap.Logger) (*gorm.DB, error) {
	base := &zapGormLogger{
		log:   log,
		level: logger.Warn,
	}
	gormLogger := logger.New(
		zapPrintfWriter{log: log},
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	return gorm.Open(postgres.Open(cfg.PostgresDSN), &gorm.Config{
		Logger:                                   base.wrap(gormLogger),
		DisableForeignKeyConstraintWhenMigrating: true,
		SkipDefaultTransaction:                   true,
	})
}

// zapPrintfWriter satisfies gorm logger.Writer (Printf-based).
type zapPrintfWriter struct {
	log *zap.Logger
}

func (w zapPrintfWriter) Printf(format string, args ...interface{}) {
	w.log.Sugar().Infof(format, args...)
}

// zapGormLogger is a thin adapter around gorm's default logger.Interface,
// allowing us to keep a zap logger reference and conform to gorm v1.26 signatures.
type zapGormLogger struct {
	log   *zap.Logger
	level logger.LogLevel
}

func (z *zapGormLogger) wrap(inner logger.Interface) logger.Interface {
	return &gormLoggerShim{
		inner: inner,
	}
}

// gormLoggerShim delegates to the provided inner logger.Interface.
// We keep it separate so we can easily swap strategy later (e.g. structured SQL logs).
type gormLoggerShim struct {
	inner logger.Interface
}

func (s *gormLoggerShim) LogMode(level logger.LogLevel) logger.Interface {
	return &gormLoggerShim{inner: s.inner.LogMode(level)}
}

func (s *gormLoggerShim) Info(ctx context.Context, msg string, args ...interface{}) {
	s.inner.Info(ctx, msg, args...)
}

func (s *gormLoggerShim) Warn(ctx context.Context, msg string, args ...interface{}) {
	s.inner.Warn(ctx, msg, args...)
}

func (s *gormLoggerShim) Error(ctx context.Context, msg string, args ...interface{}) {
	s.inner.Error(ctx, msg, args...)
}

func (s *gormLoggerShim) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	s.inner.Trace(ctx, begin, fc, err)
}

