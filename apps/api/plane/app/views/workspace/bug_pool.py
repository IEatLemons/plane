# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Q

# Third party
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ROLE, allow_permission
from plane.app.views import BaseAPIView
from plane.db.models import Issue, WorkspaceMember
from plane.utils.issue_filters import issue_filters


def _bug_pool_item(issue: Issue) -> dict:
    parent = issue.parent
    return {
        "id": str(issue.id),
        "name": issue.name,
        "sequence_id": issue.sequence_id,
        "project_id": str(issue.project_id),
        "project_name": issue.project.name,
        "project_identifier": issue.project.identifier,
        "parent_id": str(issue.parent_id) if issue.parent_id else None,
        "parent_name": parent.name if parent else "",
        "parent_sequence_id": parent.sequence_id if parent else None,
        "state_id": str(issue.state_id) if issue.state_id else None,
        "priority": issue.priority,
    }


class WorkspaceBugPoolListEndpoint(BaseAPIView):
    """Aggregate child work items (bugs / sub-work-items with a parent) across allowed projects."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug):
        queryset = Issue.issue_objects.filter(
            workspace__slug=slug,
            parent_id__isnull=False,
            project__archived_at__isnull=True,
            project__deleted_at__isnull=True,
        ).select_related("project", "parent", "state")

        project_param = request.GET.get("project_id")
        if project_param:
            queryset = queryset.filter(project_id=project_param)

        mutable_params = request.GET.copy()
        mutable_params.pop("project_id", None)
        mutable_params.pop("has_parent", None)
        filters = issue_filters(mutable_params, "GET")
        queryset = queryset.filter(**filters)

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
                    created_by=request.user,
                )
            ).distinct()

        queryset = queryset.order_by("-created_at")

        per_page = min(int(request.GET.get("per_page", 50)), 100)
        offset = int(request.GET.get("cursor", 0))
        total = queryset.count()
        page = list(queryset[offset : offset + per_page])
        data = [_bug_pool_item(i) for i in page]

        return Response(
            {
                "count": total,
                "results": data,
                "next_cursor": offset + per_page if offset + per_page < total else None,
            },
            status=status.HTTP_200_OK,
        )
