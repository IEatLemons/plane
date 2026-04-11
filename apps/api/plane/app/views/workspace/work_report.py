# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from datetime import date

from django.db.models import Q
from django.utils import timezone as django_tz
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from plane.app.permissions.workspace import Admin, WorkspaceViewerPermission
from plane.app.serializers.work_report import WorkReportNotesSerializer, WorkReportSerializer
from plane.app.views.base import BaseAPIView
from plane.db.models import User, WorkReport, Workspace, WorkspaceMember
from plane.utils.work_report_period import (
    daily_period,
    owner_start_of_week,
    utc_range_for_local_dates,
    weekly_period,
)
from plane.utils.work_report_summary import build_work_report_auto_summary


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValidationError({"period_date": "Invalid ISO date."}) from exc


def _request_project_gate(request_user) -> Q:
    return Q(
        project__project_projectmember__member=request_user,
        project__project_projectmember__is_active=True,
    )


def _can_read_report(*, request_user, workspace_slug: str, owner_id) -> bool:
    if str(request_user.id) == str(owner_id):
        return True
    return WorkspaceMember.objects.filter(
        workspace__slug=workspace_slug,
        member=request_user,
        role=Admin,
        is_active=True,
    ).exists()


class WorkspaceWorkReportEndpoint(BaseAPIView):
    """GET work report for a period (query params). Creates row and fills auto_summary as needed."""

    permission_classes = [WorkspaceViewerPermission]

    def get(self, request, slug):
        report_type = request.GET.get("type")
        if report_type not in (WorkReport.ReportType.DAILY, WorkReport.ReportType.WEEKLY):
            raise ValidationError({"type": "Must be 'daily' or 'weekly'."})

        period_raw = request.GET.get("period_date")
        if not period_raw:
            raise ValidationError({"period_date": "Required ISO date (YYYY-MM-DD)."})
        anchor = _parse_date(period_raw)

        owner_id = request.GET.get("user_id") or str(request.user.id)
        try:
            owner = User.objects.get(id=owner_id)
        except User.DoesNotExist as exc:
            raise NotFound("User not found.") from exc

        if not WorkspaceMember.objects.filter(
            workspace__slug=slug, member_id=owner_id, is_active=True
        ).exists():
            raise NotFound("User is not a member of this workspace.")

        if not _can_read_report(request_user=request.user, workspace_slug=slug, owner_id=owner_id):
            raise PermissionDenied("You do not have permission to view this work report.")

        workspace = Workspace.objects.get(slug=slug)

        if report_type == WorkReport.ReportType.DAILY:
            period_start, period_end = daily_period(anchor)
        else:
            period_start, period_end = weekly_period(anchor, owner_start_of_week(owner))

        utc_start, utc_end = utc_range_for_local_dates(period_start, period_end, owner.user_timezone)

        refresh = request.GET.get("refresh", "").lower() in ("1", "true", "yes")

        report, _created = WorkReport.objects.get_or_create(
            workspace=workspace,
            owner=owner,
            report_type=report_type,
            period_start=period_start,
            defaults={
                "period_end": period_end,
                "notes": "",
                "auto_summary": {},
            },
        )

        if report.period_end != period_end:
            report.period_end = period_end
            report.save(update_fields=["period_end", "updated_at"])

        should_refresh = (
            refresh
            or not report.auto_summary_generated_at
            or report.auto_summary in (None, {}, dict())
        )
        if should_refresh:
            summary = build_work_report_auto_summary(
                workspace_slug=slug,
                owner=owner,
                request_user_projects_filter=_request_project_gate(request.user),
                utc_start=utc_start,
                utc_end=utc_end,
            )

            report.auto_summary = summary
            report.auto_summary_generated_at = django_tz.now()
            report.save(update_fields=["auto_summary", "auto_summary_generated_at", "updated_at"])

        return Response(WorkReportSerializer(report).data, status=status.HTTP_200_OK)


class WorkspaceWorkReportDetailEndpoint(BaseAPIView):
    """PATCH notes only (owner of the report)."""

    permission_classes = [WorkspaceViewerPermission]

    def patch(self, request, slug, pk):
        try:
            report = WorkReport.objects.get(pk=pk, workspace__slug=slug)
        except WorkReport.DoesNotExist as exc:
            raise NotFound("Work report not found.") from exc

        if report.owner_id != request.user.id:
            raise PermissionDenied("Only the report owner can edit notes.")

        ser = WorkReportNotesSerializer(report, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(WorkReportSerializer(report).data, status=status.HTTP_200_OK)
