package repository

import (
	"context"

	"gorm.io/gorm"

	domainWorkspace "github.com/makeplane/plane/apps/api-go/internal/domain/workspace"
)

type WorkspaceRepository interface {
	ListForUser(ctx context.Context, userID string) ([]domainWorkspace.Workspace, error)
}

type workspaceRepo struct {
	db *gorm.DB
}

func NewWorkspaceRepository(db *gorm.DB) WorkspaceRepository {
	return &workspaceRepo{db: db}
}

// ListForUser 对应 UserWorkSpacesEndpoint 的基本行为：返回用户参与的 workspace 列表
func (r *workspaceRepo) ListForUser(ctx context.Context, userID string) ([]domainWorkspace.Workspace, error) {
	var ws []domainWorkspace.Workspace
	q := r.db.WithContext(ctx).
		Table("workspaces w").
		Select("w.id, w.name, w.slug, w.owner_id, w.timezone, w.background_color, w.created_at, w.updated_at").
		Joins("JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.is_active = TRUE").
		Where("wm.member_id = ?", userID)

	if err := q.Find(&ws).Error; err != nil {
		return nil, err
	}
	return ws, nil
}

