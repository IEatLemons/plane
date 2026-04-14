# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from django.db.models import Q
from django.utils import timezone

from plane.db.models import Issue, IssueActivity, StateGroup, User

ACTIVITY_EXCLUDED_FIELDS = ["comment", "vote", "reaction", "draft"]

HIGHLIGHT_LIMIT = 30

# Max issues listed per project per bucket (completed vs in_progress) in auto_summary.by_project
ISSUE_ROWS_PER_PROJECT_PER_TYPE = 50


def _issue_row(issue: Issue) -> dict[str, Any]:
    return {
        "id": str(issue.id),
        "sequence_id": issue.sequence_id,
        "name": issue.name,
        "project_id": str(issue.project_id) if issue.project_id else None,
        "state_id": str(issue.state_id) if issue.state_id else None,
    }


def _bucket_issues_by_project(
    qs,
    *,
    per_project_limit: int,
) -> tuple[dict[str, list[dict[str, Any]]], dict[str, str]]:
    """Fill per-project lists up to per_project_limit each; collect project display names."""
    by_project: dict[str, list[dict[str, Any]]] = defaultdict(list)
    names: dict[str, str] = {}
    for issue in qs.iterator(chunk_size=200):
        pid = str(issue.project_id) if issue.project_id else ""
        if not pid:
            continue
        if pid not in names:
            names[pid] = issue.project.name if issue.project else ""
        if len(by_project[pid]) >= per_project_limit:
            continue
        by_project[pid].append(_issue_row(issue))
    return by_project, names


def _merge_by_project(
    completed_map: dict[str, list[dict[str, Any]]],
    completed_names: dict[str, str],
    in_progress_map: dict[str, list[dict[str, Any]]],
    in_progress_names: dict[str, str],
) -> list[dict[str, Any]]:
    all_ids = set(completed_map.keys()) | set(in_progress_map.keys())
    name_by_pid = {**completed_names, **in_progress_names}
    rows: list[dict[str, Any]] = []
    for pid in sorted(all_ids):
        rows.append(
            {
                "project_id": pid,
                "project_name": name_by_pid.get(pid, ""),
                "completed": completed_map.get(pid, []),
                "in_progress": in_progress_map.get(pid, []),
            }
        )
    return rows


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

    Per-project buckets:
    - completed: issues assigned to owner with completed_at in [utc_start, utc_end).
    - in_progress: snapshot at generation time — assigned, state.group started, not completed, not draft.
    """
    issue_base = Issue.issue_objects.filter(
        workspace__slug=workspace_slug,
        project__archived_at__isnull=True,
    ).filter(request_user_projects_filter)

    assignee_filter = Q(
        assignees__in=[owner],
        issue_assignee__deleted_at__isnull=True,
    )

    completed_issues = issue_base.filter(
        assignee_filter,
        completed_at__gte=utc_start,
        completed_at__lt=utc_end,
    ).count()

    created_issues = issue_base.filter(
        created_by_id=owner.id,
        created_at__gte=utc_start,
        created_at__lt=utc_end,
    ).count()

    completed_qs = (
        issue_base.filter(
            assignee_filter,
            completed_at__gte=utc_start,
            completed_at__lt=utc_end,
        )
        .select_related("project", "state")
        .distinct()
        .order_by("project_id", "sequence_id")
    )

    in_progress_qs = (
        issue_base.filter(
            assignee_filter,
            state__group=StateGroup.STARTED,
            completed_at__isnull=True,
            is_draft=False,
        )
        .select_related("project", "state")
        .distinct()
        .order_by("project_id", "sequence_id")
    )

    completed_map, completed_names = _bucket_issues_by_project(
        completed_qs,
        per_project_limit=ISSUE_ROWS_PER_PROJECT_PER_TYPE,
    )
    in_progress_map, in_progress_names = _bucket_issues_by_project(
        in_progress_qs,
        per_project_limit=ISSUE_ROWS_PER_PROJECT_PER_TYPE,
    )
    by_project = _merge_by_project(completed_map, completed_names, in_progress_map, in_progress_names)

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
        "by_project": by_project,
        "highlights": highlights,
        "generated_at": timezone.now().isoformat(),
    }
