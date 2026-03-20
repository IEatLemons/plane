package issue

import "time"

// Issue 映射 issues 表的基础视图字段（列表场景常用）
type Issue struct {
	ID           string     `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID    string     `gorm:"column:project_id"`
	WorkspaceID  string     `gorm:"column:workspace_id"`
	Name         string     `gorm:"column:name"`
	StateID      *string    `gorm:"column:state_id"`
	Priority     string     `gorm:"column:priority"`
	SequenceID   int        `gorm:"column:sequence_id"`
	SortOrder    float64    `gorm:"column:sort_order"`
	StartDate    *time.Time `gorm:"column:start_date"`
	TargetDate   *time.Time `gorm:"column:target_date"`
	CompletedAt  *time.Time `gorm:"column:completed_at"`
	ArchivedAt   *time.Time `gorm:"column:archived_at"`
	IsDraft      bool       `gorm:"column:is_draft"`
	CreatedAt    time.Time  `gorm:"column:created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at"`
	CreatedByID  string     `gorm:"column:created_by_id"`
	UpdatedByID  string     `gorm:"column:updated_by_id"`
}

func (Issue) TableName() string {
	return "issues"
}

