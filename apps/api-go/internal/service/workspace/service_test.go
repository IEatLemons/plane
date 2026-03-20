package workspace

import (
	"context"
	"testing"

	"go.uber.org/zap"

	domain "github.com/makeplane/plane/apps/api-go/internal/domain/workspace"
)

type fakeRepo struct {
	out []domain.Workspace
	err error
}

func (f *fakeRepo) ListForUser(ctx context.Context, userID string) ([]domain.Workspace, error) {
	return f.out, f.err
}

func TestListUserWorkspaces(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	repo := &fakeRepo{
		out: []domain.Workspace{
			{ID: "ws-1", Name: "Workspace 1", Slug: "ws-1"},
		},
	}

	svc := NewService(repo, logger)

	ws, err := svc.ListUserWorkspaces(context.Background(), "user-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(ws) != 1 || ws[0].ID != "ws-1" {
		t.Fatalf("unexpected workspaces: %+v", ws)
	}
}

