package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/makeplane/plane/apps/api-go/internal/config"
	"github.com/makeplane/plane/apps/api-go/internal/http/middleware"
	issueHandler "github.com/makeplane/plane/apps/api-go/internal/http/handler/issue"
	projectHandler "github.com/makeplane/plane/apps/api-go/internal/http/handler/project"
	workspaceHandler "github.com/makeplane/plane/apps/api-go/internal/http/handler/workspace"
	"github.com/makeplane/plane/apps/api-go/internal/repository"
	issueService "github.com/makeplane/plane/apps/api-go/internal/service/issue"
	projectService "github.com/makeplane/plane/apps/api-go/internal/service/project"
	workspaceService "github.com/makeplane/plane/apps/api-go/internal/service/workspace"
)

func Register(engine *gin.Engine, cfg *config.Config, logger *zap.Logger, db *gorm.DB) {
	engine.Use(
		middleware.RequestID(),
		middleware.Recovery(logger),
		middleware.Logger(logger),
		middleware.SimpleAuth(),
	)

	// infra health
	engine.GET("/health", func(c *gin.Context) {
		if err := db.Exec("SELECT 1").Error; err != nil {
			logger.Error("health check failed", zap.Error(err))
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// repositories & services (更多模块逐步挂接)
	workspaceRepo := repository.NewWorkspaceRepository(db)
	workspaceSvc := workspaceService.NewService(workspaceRepo, logger)
	wsHandler := workspaceHandler.NewHandler(workspaceSvc)

	projectRepo := repository.NewProjectRepository(db)
	projectSvc := projectService.NewService(projectRepo, logger)
	prjHandler := projectHandler.NewHandler(projectSvc)

	issueRepo := repository.NewIssueRepository(db)
	issueSvc := issueService.NewService(issueRepo, logger)
	issHandler := issueHandler.NewHandler(issueSvc)

	api := engine.Group("/api-go")
	{
		api.GET("/workspaces", wsHandler.ListUserWorkspaces)
		api.GET("/workspaces/:slug/projects", prjHandler.ListByWorkspace)
		api.GET("/workspaces/:slug/projects/:project_id/issues", issHandler.ListByProject)
	}
}

