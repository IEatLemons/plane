package issue

import (
	"context"

	"go.uber.org/zap"

	domain "github.com/makeplane/plane/apps/api-go/internal/domain/issue"
	"github.com/makeplane/plane/apps/api-go/internal/repository"
)

type Service interface {
	ListByProject(ctx context.Context, workspaceSlug, projectID string) ([]domain.Issue, error)
}

type service struct {
	repo   repository.IssueRepository
	logger *zap.Logger
}

func NewService(repo repository.IssueRepository, logger *zap.Logger) Service {
	return &service{repo: repo, logger: logger}
}

func (s *service) ListByProject(ctx context.Context, workspaceSlug, projectID string) ([]domain.Issue, error) {
	is, err := s.repo.ListByProject(ctx, workspaceSlug, projectID)
	if err != nil {
		s.logger.Error("list issues failed", zap.Error(err), zap.String("workspace_slug", workspaceSlug), zap.String("project_id", projectID))
		return nil, err
	}
	return is, nil
}

