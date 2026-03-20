package workspace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	domain "github.com/makeplane/plane/apps/api-go/internal/domain/workspace"
)

type fakeService struct {
	out []domain.Workspace
	err error
}

func (f *fakeService) ListUserWorkspaces(_ context.Context, _ string) ([]domain.Workspace, error) {
	return f.out, f.err
}

func TestListUserWorkspaces_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	req, _ := http.NewRequest(http.MethodGet, "/api-go/workspaces", nil)
	c.Request = req

	h := NewHandler(nil)
	h.ListUserWorkspaces(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d got %d", http.StatusUnauthorized, w.Code)
	}
}

