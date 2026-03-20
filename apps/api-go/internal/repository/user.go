package repository

import (
	"context"

	"gorm.io/gorm"

	domainUser "github.com/makeplane/plane/apps/api-go/internal/domain/user"
)

type UserRepository interface {
	FindByID(ctx context.Context, id string) (*domainUser.User, error)
}

type userRepo struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) FindByID(ctx context.Context, id string) (*domainUser.User, error) {
	var u domainUser.User
	if err := r.db.WithContext(ctx).First(&u, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

