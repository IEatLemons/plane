package worker

import (
	"context"
	"time"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	"github.com/makeplane/plane/apps/api-go/internal/config"
)

const (
	QueueDefault = "default"
)

type Worker struct {
	srv    *asynq.Server
	client *asynq.Client
	logger *zap.Logger
}

func NewWorker(cfg *config.Config, logger *zap.Logger) *Worker {
	redisOpt := asynq.RedisClientOpt{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	}

	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: 10,
		Queues: map[string]int{
			QueueDefault: 1,
		},
	})

	client := asynq.NewClient(redisOpt)

	return &Worker{
		srv:    srv,
		client: client,
		logger: logger,
	}
}

func (w *Worker) Start(mux *asynq.ServeMux) error {
	go func() {
		if err := w.srv.Run(mux); err != nil {
			w.logger.Error("asynq server stopped", zap.Error(err))
		}
	}()
	return nil
}

func (w *Worker) Shutdown(ctx context.Context) error {
	shutdownCh := make(chan struct{})
	go func() {
		w.srv.Shutdown()
		_ = w.client.Close()
		close(shutdownCh)
	}()

	select {
	case <-shutdownCh:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// EnqueueExample 是一个示例任务，后续可替换成 workspace_seed、issue_activity 等。
func (w *Worker) EnqueueExample(ctx context.Context, payload []byte) error {
	task := asynq.NewTask("example:echo", payload, asynq.Queue(QueueDefault), asynq.Timeout(30*time.Second))
	_, err := w.client.EnqueueContext(ctx, task)
	return err
}

