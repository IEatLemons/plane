# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import serializers


def merge_issue_schedule_dates(attrs, instance):
    """Merge partial update attrs with existing instance for ordered date validation."""

    def pick(key):
        if key in attrs:
            return attrs[key]
        return getattr(instance, key, None) if instance else None

    return {
        "start_date": pick("start_date"),
        "initial_target_date": pick("initial_target_date"),
        "evaluated_target_date": pick("evaluated_target_date"),
        "target_date": pick("target_date"),
    }


def validate_issue_schedule_date_order(attrs, instance):
    dates = merge_issue_schedule_dates(attrs, instance)
    order_keys = ["start_date", "initial_target_date", "evaluated_target_date", "target_date"]
    last = None
    for k in order_keys:
        v = dates.get(k)
        if v is None:
            continue
        if last is not None and last > v:
            raise serializers.ValidationError(
                "Schedule dates must follow: start ≤ initial expected ≤ evaluated estimate ≤ confirmed due date"
            )
        last = v
