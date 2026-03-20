package workspace

import (
	"net/http"

	"github.com/gin-gonic/gin"

	workspaceService "github.com/makeplane/plane/apps/api-go/internal/service/workspace"
)

type Handler struct {
	svc workspaceService.Service
}

func NewHandler(svc workspaceService.Service) *Handler {
	return &Handler{svc: svc}
}

// GET /api-go/workspaces
// 暂时从 Header: X-User-ID 取用户 ID，后续接入真实认证中间件。
func (h *Handler) ListUserWorkspaces(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing X-User-ID header"})
		return
	}

	ws, err := h.svc.ListUserWorkspaces(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list workspaces"})
		return
	}

	c.JSON(http.StatusOK, ws)
}

