# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db.models import Q
from django.utils import timezone

from plane.db.models import Issue, IssueActivity, User

ACTIVITY_EXCLUDED_FIELDS = ["comment", "vote", "reaction", "draft"]

HIGHLIGHT_LIMIT = 30


def build_work_report_auto_summary(
    *,
    workspace_slug: str,
    owner: User,
    request_user_projects_filter: Q,
    utc_start: datetime,
    utc_end: datetime,
) -> dict[str, Any]:
    """
    Aggregate issue stats and issue activities for the owner within the UTC half-open range [utc_start, utc_end).
    request_user_projects_filter restricts to projects the API caller can access (membership gate).
    """
    issue_base = Issue.issue_objects.filter(
        workspace__slug=workspace_slug,
        project__archived_at__isnull=True,
    ).filter(request_user_projects_filter)

    completed_issues = issue_base.filter(
        assignees__in=[owner],
        issue_assignee__deleted_at__isnull=True,
        completed_at__gte=utc_start,
        completed_at__lt=utc_end,
    ).count()

    created_issues = issue_base.filter(
        created_by_id=owner.id,
        created_at__gte=utc_start,
        created_at__lt=utc_end,
    ).count()

    activities_base = IssueActivity.objects.filter(
        ~Q(field__in=ACTIVITY_EXCLUDED_FIELDS),
        workspace__slug=workspace_slug,
        actor_id=owner.id,
        created_at__gte=utc_start,
        created_at__lt=utc_end,
        project__archived_at__isnull=True,
    ).filter(request_user_projects_filter)

    activity_count = activities_base.count()

    activity_rows = (
        activities_base.select_related("issue", "project").order_by("-created_at")[:HIGHLIGHT_LIMIT]
    )

    highlights: list[dict[str, Any]] = []
    for act in activity_rows:
        issue = act.issue
        highlights.append(
            {
                "id": str(act.id),
                "created_at": act.created_at.isoformat() if act.created_at else None,
                "verb": act.verb,
                "field": act.field,
                "old_value": act.old_value,
                "new_value": act.new_value,
                "issue_id": str(issue.id) if issue else None,
                "issue_name": issue.name if issue else None,
                "project_id": str(act.project_id) if act.project_id else None,
            }
        )

    return {
        "stats": {
            "completed_issues": completed_issues,
            "created_issues": created_issues,
            "activity_count": activity_count,
        },
        "highlights": highlights,
        "generated_at": timezone.now().isoformat(),
    }
