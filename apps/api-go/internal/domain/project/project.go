package project

import "time"

// Project 映射 projects 表的关键字段
type Project struct {
	ID          string     `gorm:"column:id;type:uuid;primaryKey"`
	Name        string     `gorm:"column:name"`
	Description string     `gorm:"column:description"`
	Identifier  string     `gorm:"column:identifier"`
	WorkspaceID string     `gorm:"column:workspace_id"`
	Network     int        `gorm:"column:network"`
	ArchivedAt  *time.Time `gorm:"column:archived_at"`
	CreatedAt   time.Time  `gorm:"column:created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at"`
}

func (Project) TableName() string {
	return "projects"
}

