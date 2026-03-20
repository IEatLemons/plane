package middleware

import "github.com/gin-gonic/gin"

const (
	UserIDContextKey = "user_id"
	userIDHeader     = "X-User-ID"
)

// SimpleAuth 是一个占位认证中间件：从 Header 中提取用户 ID 放到 context。
// 后续可以替换为 JWT/Session 等完整实现，但对上层 Handler 接口保持不变。
func SimpleAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetHeader(userIDHeader)
		if userID != "" {
			c.Set(UserIDContextKey, userID)
		}
		// 不在这里强制校验，具体接口可按需要检查 user_id
		c.Next()
	}
}

