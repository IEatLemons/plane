package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"github.com/joho/godotenv"

	"github.com/makeplane/plane/apps/api-go/internal/config"
	"github.com/makeplane/plane/apps/api-go/internal/http/router"
	"github.com/makeplane/plane/apps/api-go/internal/repository"
)

func main() {
	// 尝试加载本服务和 Django API 的 .env（不存在则忽略错误）
	_ = godotenv.Load(
		".env",              // apps/api-go/.env
		"../api/.env",       // apps/api/.env
	)

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	logger, err := config.NewLogger(cfg)
	if err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer logger.Sync() //nolint:errcheck

	logger.Info("loaded config",
		zap.String("http_addr", cfg.HTTPAddr()),
		zap.String("postgres_dsn", config.RedactDSN(cfg.PostgresDSN)),
	)

	db, err := repository.NewDB(cfg, logger)
	if err != nil {
		logger.Fatal("failed to connect database", zap.Error(err))
	}
	sqlDB, err := db.DB()
	if err != nil {
		logger.Fatal("failed to get sql DB", zap.Error(err))
	}
	defer sqlDB.Close()

	engine := gin.New()
	router.Register(engine, cfg, logger, db)

	srv := &http.Server{
		Addr:    cfg.HTTPAddr(),
		Handler: engine,
	}

	go func() {
		logger.Info("starting api-go server", zap.String("addr", cfg.HTTPAddr()))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server listen failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server forced to shutdown", zap.Error(err))
	}

	logger.Info("server exited")
}

