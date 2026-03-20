package workspace

import "time"

// Workspace 对应 Django Workspace 模型的核心字段
type Workspace struct {
	ID              string    `gorm:"column:id;type:uuid;primaryKey"`
	Name            string    `gorm:"column:name"`
	Slug            string    `gorm:"column:slug"`
	OwnerID         string    `gorm:"column:owner_id"`
	Timezone        string    `gorm:"column:timezone"`
	BackgroundColor string    `gorm:"column:background_color"`
	CreatedAt       time.Time `gorm:"column:created_at"`
	UpdatedAt       time.Time `gorm:"column:updated_at"`
}

func (Workspace) TableName() string {
	return "workspaces"
}

