package repository

import (
	"context"

	"gorm.io/gorm"

	domainProject "github.com/makeplane/plane/apps/api-go/internal/domain/project"
)

type ProjectRepository interface {
	ListByWorkspace(ctx context.Context, workspaceSlug string, userID string) ([]domainProject.Project, error)
}

type projectRepo struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) ProjectRepository {
	return &projectRepo{db: db}
}

// ListByWorkspace 参考 Django ProjectViewSet.list 的简化版：
// 返回用户在某个 workspace 下可见的项目列表。
func (r *projectRepo) ListByWorkspace(ctx context.Context, workspaceSlug string, userID string) ([]domainProject.Project, error) {
	var projects []domainProject.Project

	q := r.db.WithContext(ctx).
		Table("projects p").
		Joins("JOIN workspaces w ON w.id = p.workspace_id").
		Joins("LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.is_active = TRUE").
		Where("w.slug = ?", workspaceSlug).
		Where("pm.member_id = ?", userID)

	if err := q.Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

