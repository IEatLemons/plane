package workspace

import (
	"context"

	"go.uber.org/zap"

	domain "github.com/makeplane/plane/apps/api-go/internal/domain/workspace"
	"github.com/makeplane/plane/apps/api-go/internal/repository"
)

type Service interface {
	ListUserWorkspaces(ctx context.Context, userID string) ([]domain.Workspace, error)
}

type service struct {
	repo   repository.WorkspaceRepository
	logger *zap.Logger
}

func NewService(repo repository.WorkspaceRepository, logger *zap.Logger) Service {
	return &service{repo: repo, logger: logger}
}

func (s *service) ListUserWorkspaces(ctx context.Context, userID string) ([]domain.Workspace, error) {
	ws, err := s.repo.ListForUser(ctx, userID)
	if err != nil {
		s.logger.Error("list user workspaces failed", zap.Error(err), zap.String("user_id", userID))
		return nil, err
	}
	return ws, nil
}

