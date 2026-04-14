# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from plane.app.permissions.workspace import WorkspaceOwnerPermission
from plane.app.views.base import BaseAPIView
from plane.app.views.workspace.work_report import _parse_date, _request_project_gate
from plane.db.models import WorkspaceMember
from plane.utils.work_report_period import daily_period, utc_range_for_local_dates
from plane.utils.work_report_summary import build_work_report_auto_summary


class WorkspaceDailyTeamDigestEndpoint(BaseAPIView):
    """
    Workspace admins only: per-member auto_summary (including by_project) for a calendar day.
    Each member's completed-in-period window uses that member's timezone (same as personal daily report).
    """

    permission_classes = [IsAuthenticated, WorkspaceOwnerPermission]

    def get(self, request, slug):
        period_raw = request.GET.get("period_date")
        if not period_raw:
            raise ValidationError({"period_date": "Required ISO date (YYYY-MM-DD)."})
        anchor = _parse_date(period_raw)
        period_start, period_end = daily_period(anchor)

        gate = _request_project_gate(request.user)

        members = (
            WorkspaceMember.objects.filter(workspace__slug=slug, is_active=True)
            .select_related("member")
            .order_by("member__email")
        )

        users_payload: list[dict] = []
        for wm in members:
            owner = wm.member
            utc_start, utc_end = utc_range_for_local_dates(
                period_start, period_end, owner.user_timezone
            )
            summary = build_work_report_auto_summary(
                workspace_slug=slug,
                owner=owner,
                request_user_projects_filter=gate,
                utc_start=utc_start,
                utc_end=utc_end,
            )
            display = (owner.display_name or "").strip() or (owner.get_full_name() or "").strip()
            if not display:
                display = owner.email or str(owner.id)
            users_payload.append(
                {
                    "user_id": str(owner.id),
                    "display_name": display,
                    "auto_summary": summary,
                }
            )

        return Response(
            {
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "users": users_payload,
            },
            status=status.HTTP_200_OK,
        )
