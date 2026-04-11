# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Pure date/time helpers for work reports (no Django imports)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, time, timezone as dt_timezone
from typing import Tuple

import zoneinfo

# Keys match Profile.start_of_the_week (0=Sunday .. 6=Saturday).
PROFILE_DOW_TO_PYTHON_WEEKDAY = {
    0: 6,
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
}


def daily_period(anchor: date) -> Tuple[date, date]:
    return anchor, anchor


def weekly_period(anchor: date, start_of_week: int) -> Tuple[date, date]:
    start_wd = PROFILE_DOW_TO_PYTHON_WEEKDAY.get(start_of_week, PROFILE_DOW_TO_PYTHON_WEEKDAY[0])
    days_back = (anchor.weekday() - start_wd) % 7
    week_start = anchor - timedelta(days=days_back)
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def utc_range_for_local_dates(period_start: date, period_end: date, tz_name: str) -> Tuple[datetime, datetime]:
    """Return [start_utc, end_utc) for all instants that fall on period_start..period_end in the given tz."""
    tz = zoneinfo.ZoneInfo(tz_name)
    start_local = datetime.combine(period_start, time.min, tzinfo=tz)
    end_local_exclusive = datetime.combine(period_end + timedelta(days=1), time.min, tzinfo=tz)
    return (
        start_local.astimezone(dt_timezone.utc),
        end_local_exclusive.astimezone(dt_timezone.utc),
    )
