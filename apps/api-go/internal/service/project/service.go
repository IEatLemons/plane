package project

import (
	"context"

	"go.uber.org/zap"

	domain "github.com/makeplane/plane/apps/api-go/internal/domain/project"
	"github.com/makeplane/plane/apps/api-go/internal/repository"
)

type Service interface {
	ListByWorkspace(ctx context.Context, workspaceSlug, userID string) ([]domain.Project, error)
}

type service struct {
	repo   repository.ProjectRepository
	logger *zap.Logger
}

func NewService(repo repository.ProjectRepository, logger *zap.Logger) Service {
	return &service{repo: repo, logger: logger}
}

func (s *service) ListByWorkspace(ctx context.Context, workspaceSlug, userID string) ([]domain.Project, error) {
	ps, err := s.repo.ListByWorkspace(ctx, workspaceSlug, userID)
	if err != nil {
		s.logger.Error("list projects failed", zap.Error(err), zap.String("workspace_slug", workspaceSlug), zap.String("user_id", userID))
		return nil, err
	}
	return ps, nil
}

