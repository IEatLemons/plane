package issue

import (
	"net/http"

	"github.com/gin-gonic/gin"

	issueService "github.com/makeplane/plane/apps/api-go/internal/service/issue"
)

type Handler struct {
	svc issueService.Service
}

func NewHandler(svc issueService.Service) *Handler {
	return &Handler{svc: svc}
}

// GET /api-go/workspaces/:slug/projects/:project_id/issues
func (h *Handler) ListByProject(c *gin.Context) {
	slug := c.Param("slug")
	projectID := c.Param("project_id")
	if slug == "" || projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing workspace slug or project_id"})
		return
	}

	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-ID header"})
		return
	}

	issues, err := h.svc.ListByProject(c.Request.Context(), slug, projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list issues"})
		return
	}

	c.JSON(http.StatusOK, issues)
}

