# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Subquery annotations for direct child issue completion progress."""

from django.db.models import Count, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce

from plane.db.models import Issue
from plane.db.models.state import StateGroup


def get_sub_issue_progress_annotations():
    """
    For each issue, annotate:
    - sub_issues_done_count: children in completed state
    - sub_issues_eligible_count: children not in cancelled state (denominator for progress)
    """
    return {
        "sub_issues_done_count": Coalesce(
            Subquery(
                Issue.issue_objects.filter(
                    parent_id=OuterRef("id"),
                    state__group=StateGroup.COMPLETED.value,
                )
                .values("parent_id")
                .annotate(_cnt=Count("id"))
                .values("_cnt")[:1],
                output_field=IntegerField(),
            ),
            Value(0),
        ),
        "sub_issues_eligible_count": Coalesce(
            Subquery(
                Issue.issue_objects.filter(parent_id=OuterRef("id"))
                .exclude(state__group=StateGroup.CANCELLED.value)
                .values("parent_id")
                .annotate(_cnt=Count("id"))
                .values("_cnt")[:1],
                output_field=IntegerField(),
            ),
            Value(0),
        ),
    }
