# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Work report period resolution using owner Profile (Django)."""

from __future__ import annotations

from datetime import date, datetime
from typing import Tuple

from plane.db.models import Profile, User

from plane.utils.work_report_calendar import (
    daily_period,
    utc_range_for_local_dates,
    weekly_period,
)


def owner_start_of_week(owner: User) -> int:
    profile = Profile.objects.filter(user=owner).only("start_of_the_week").first()
    if profile is None:
        return 0
    return profile.start_of_the_week


__all__ = (
    "daily_period",
    "weekly_period",
    "utc_range_for_local_dates",
    "owner_start_of_week",
)
