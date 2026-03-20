# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Development settings"""

import os

from .common import *  # noqa

DEBUG = True

# Admin Vite (e.g. :3001) and API (:8000) are different sites. With the default
# SameSite=Lax, browsers do not attach session cookies to credentialed XHR/fetch
# from the admin origin to the API, so sign-up/sign-in succeed (302) but
# GET /api/instances/admins/me/ returns 401. None requires Secure; localhost is
# treated as a secure context for Secure cookies in Chromium/Firefox.
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SECURE = True

# Debug Toolbar settings
INSTALLED_APPS += ("debug_toolbar",)  # noqa
MIDDLEWARE += ("debug_toolbar.middleware.DebugToolbarMiddleware",)  # noqa

DEBUG_TOOLBAR_PATCH_SETTINGS = False

# Only show emails in console don't send it to smtp
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,  # noqa
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
}

INTERNAL_IPS = ("127.0.0.1",)

MEDIA_URL = "/uploads/"
MEDIA_ROOT = os.path.join(BASE_DIR, "uploads")  # noqa

LOG_DIR = os.path.join(BASE_DIR, "logs")  # noqa

if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Set DJANGO_LOG_SQL=0 to hide noisy SQL in the console.
_DJANGO_LOG_SQL = os.environ.get("DJANGO_LOG_SQL", "1") not in ("0", "false", "False")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "fmt": "%(levelname)s %(asctime)s %(module)s %(name)s %(message)s",
        },
        "sql": {
            "format": "[SQL] {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
        "sql_console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "sql",
        },
    },
    "loggers": {
        "plane.api.request": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.api": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "plane.worker": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "plane.exception": {
            "level": "ERROR",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.external": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.mongo": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.authentication": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        "plane.migrations": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
        **(
            {
                "django.db.backends": {
                    "level": "DEBUG",
                    "handlers": ["sql_console"],
                    "propagate": False,
                },
            }
            if _DJANGO_LOG_SQL
            else {}
        ),
    },
}
