# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date

import pytest

pytestmark = pytest.mark.unit

from plane.utils.work_report_calendar import weekly_period


def test_weekly_period_starts_sunday():
    anchor = date(2026, 4, 6)  # Monday
    start, end = weekly_period(anchor, 0)
    assert start == date(2026, 4, 5)
    assert end == date(2026, 4, 11)


def test_weekly_period_starts_monday():
    anchor = date(2026, 4, 8)  # Wednesday
    start, end = weekly_period(anchor, 1)
    assert start == date(2026, 4, 6)
    assert end == date(2026, 4, 12)
