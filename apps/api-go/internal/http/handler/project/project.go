package project

import (
	"net/http"

	"github.com/gin-gonic/gin"

	projectService "github.com/makeplane/plane/apps/api-go/internal/service/project"
)

type Handler struct {
	svc projectService.Service
}

func NewHandler(svc projectService.Service) *Handler {
	return &Handler{svc: svc}
}

// GET /api-go/workspaces/:slug/projects
func (h *Handler) ListByWorkspace(c *gin.Context) {
	slug := c.Param("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing workspace slug"})
		return
	}

	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-ID header"})
		return
	}

	projects, err := h.svc.ListByWorkspace(c.Request.Context(), slug, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list projects"})
		return
	}

	c.JSON(http.StatusOK, projects)
}

