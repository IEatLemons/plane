package config

import (
	"net/url"
)

// RedactDSN 用于日志输出时隐藏凭据。
func RedactDSN(dsn string) string {
	u, err := url.Parse(dsn)
	if err != nil || u.User == nil {
		return dsn
	}

	username := u.User.Username()
	if username == "" {
		return dsn
	}

	u.User = url.UserPassword(username, "****")
	return u.String()
}

