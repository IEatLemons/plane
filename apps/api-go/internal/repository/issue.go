package repository

import (
	"context"

	"gorm.io/gorm"

	domainIssue "github.com/makeplane/plane/apps/api-go/internal/domain/issue"
)

type IssueRepository interface {
	ListByProject(ctx context.Context, workspaceSlug string, projectID string) ([]domainIssue.Issue, error)
}

type issueRepo struct {
	db *gorm.DB
}

func NewIssueRepository(db *gorm.DB) IssueRepository {
	return &issueRepo{db: db}
}

// ListByProject 对应 IssueViewSet.list 的一个大幅精简版本：
// 仅返回基础字段，不做复杂过滤/分组。
func (r *issueRepo) ListByProject(ctx context.Context, workspaceSlug string, projectID string) ([]domainIssue.Issue, error) {
	var issues []domainIssue.Issue

	q := r.db.WithContext(ctx).
		Table("issues i").
		Joins("JOIN projects p ON p.id = i.project_id").
		Joins("JOIN workspaces w ON w.id = p.workspace_id").
		Where("w.slug = ?", workspaceSlug).
		Where("p.id = ?", projectID)

	if err := q.Find(&issues).Error; err != nil {
		return nil, err
	}
	return issues, nil
}

