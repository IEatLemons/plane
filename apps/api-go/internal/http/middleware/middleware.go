package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const requestIDKey = "X-Request-ID"

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Request.Header.Get(requestIDKey)
		if id == "" {
			id = uuid.NewString()
		}
		c.Writer.Header().Set(requestIDKey, id)
		c.Set(requestIDKey, id)
		c.Next()
	}
}

func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return gin.RecoveryWithWriter(gin.DefaultErrorWriter)
}

func Logger(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		reqID, _ := c.Get(requestIDKey)

		logger.Info("http request",
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("latency", latency),
			zap.Any("request_id", reqID),
		)
	}
}

