# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Q

# Third party
from rest_framework import serializers, status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ROLE, allow_permission
from plane.app.views import BaseAPIView
from plane.db.models import IntakeIssue, IntakeIssueStatus, WorkspaceMember


class WorkspaceRequirementPoolItemSerializer(serializers.ModelSerializer):
    issue_id = serializers.UUIDField(source="issue.id", read_only=True)
    issue_name = serializers.CharField(source="issue.name", read_only=True)
    issue_sequence_id = serializers.IntegerField(source="issue.sequence_id", read_only=True)
    project_id = serializers.UUIDField(source="project.id", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_identifier = serializers.CharField(source="project.identifier", read_only=True)

    class Meta:
        model = IntakeIssue
        fields = [
            "id",
            "status",
            "created_at",
            "issue_id",
            "issue_name",
            "issue_sequence_id",
            "project_id",
            "project_name",
            "project_identifier",
        ]


class WorkspaceRequirementPoolListEndpoint(BaseAPIView):
    """Aggregate intake (requirement) items across projects with intake enabled."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug):
        status_param = request.GET.get("status", "pending")
        queryset = (
            IntakeIssue.objects.filter(
                workspace__slug=slug,
                project__archived_at__isnull=True,
                project__deleted_at__isnull=True,
                project__intake_view=True,
                deleted_at__isnull=True,
            )
            .select_related("issue", "project", "intake")
            .order_by("-created_at")
        )

        if status_param == "pending":
            queryset = queryset.filter(status=IntakeIssueStatus.PENDING)
        elif status_param == "all_open":
            queryset = queryset.filter(
                status__in=[
                    IntakeIssueStatus.PENDING,
                    IntakeIssueStatus.SNOOZED,
                ]
            )
        # else: no extra status filter (all non-deleted intakes for allowed projects)

        is_workspace_admin = WorkspaceMember.objects.filter(
            workspace__slug=slug, member=request.user, role=ROLE.ADMIN.value, is_active=True
        ).exists()

        if not is_workspace_admin:
            queryset = queryset.filter(
                Q(
                    project__project_projectmember__member=request.user,
                    project__project_projectmember__is_active=True,
                    project__project_projectmember__role__gt=ROLE.GUEST.value,
                )
                | Q(
                    project__project_projectmember__member=request.user,
                    project__project_projectmember__is_active=True,
                    project__project_projectmember__role=ROLE.GUEST.value,
                    project__guest_view_all_features=True,
                )
                | Q(
                    project__project_projectmember__member=request.user,
                    project__project_projectmember__is_active=True,
                    project__project_projectmember__role=ROLE.GUEST.value,
                    project__guest_view_all_features=False,
                    issue__created_by=request.user,
                )
            ).distinct()

        per_page = min(int(request.GET.get("per_page", 50)), 100)
        offset = int(request.GET.get("cursor", 0))
        total = queryset.count()
        page = queryset[offset : offset + per_page]
        data = WorkspaceRequirementPoolItemSerializer(page, many=True).data
        return Response(
            {
                "count": total,
                "results": data,
                "next_cursor": offset + per_page if offset + per_page < total else None,
            },
            status=status.HTTP_200_OK,
        )
