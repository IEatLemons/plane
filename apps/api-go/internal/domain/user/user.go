package user

import "time"

// User maps核心字段到 users 表
type User struct {
	ID           string    `gorm:"column:id;type:uuid;primaryKey"`
	Username     string    `gorm:"column:username"`
	Email        *string   `gorm:"column:email"`
	DisplayName  string    `gorm:"column:display_name"`
	AvatarURL    *string   `gorm:"-"`
	Avatar       string    `gorm:"column:avatar"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at"`
	IsActive     bool      `gorm:"column:is_active"`
	IsBot        bool      `gorm:"column:is_bot"`
	UserTimezone string    `gorm:"column:user_timezone"`
}

func (User) TableName() string {
	return "users"
}

