# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Ensure a license Instance row exists (normally done by register_instance at deploy)."""

# Python imports
import os
import secrets

# Django imports
from django.utils import timezone

# Module imports
from plane.license.models import Instance, InstanceEdition


def _default_version() -> str:
    return os.environ.get("APP_VERSION") or "v0.1.0"


def get_or_bootstrap_community_instance() -> Instance:
    """
    Return the singleton Instance, creating a community placeholder if missing.
    Mirrors plane.license.management.commands.register_instance bootstrap.
    """
    instance = Instance.objects.first()
    if instance is not None:
        return instance
    now = timezone.now()
    version = _default_version()
    return Instance.objects.create(
        instance_name="Plane Community Edition",
        instance_id=secrets.token_hex(12),
        current_version=version,
        latest_version=version,
        last_checked_at=now,
        is_test=os.environ.get("IS_TEST", "0") == "1",
        edition=InstanceEdition.PLANE_COMMUNITY.value,
    )
