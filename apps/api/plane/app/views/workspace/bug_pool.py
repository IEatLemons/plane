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
from plane.db.models import Defect, WorkspaceMember


def _bug_pool_item(defect: Defect) -> dict:
    task = defect.task if defect.task_id else None
    return {
        "id": str(defect.id),
        "name": defect.name,
        "sequence_id": defect.sequence_id,
        "project_id": str(defect.project_id),
        "project_name": defect.project.name,
        "project_identifier": defect.project.identifier,
        "parent_id": str(task.id) if task else None,
        "parent_name": task.name if task else "",
        "parent_sequence_id": task.sequence_id if task else None,
        "state_id": str(defect.state_id) if defect.state_id else None,
        "priority": defect.priority,
        "task_id": str(task.id) if task else None,
    }


class WorkspaceBugPoolListEndpoint(BaseAPIView):
    """Aggregate defects across allowed projects (optional parent work item)."""

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST], level="WORKSPACE")
    def get(self, request, slug):
        queryset = Defect.objects.filter(
            workspace__slug=slug,
            project__archived_at__isnull=True,
            project__deleted_at__isnull=True,
        ).select_related("project", "task", "state")

        project_param = request.GET.get("project_id")
        if project_param:
            queryset = queryset.filter(project_id=project_param)

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
        data = [_bug_pool_item(d) for d in page]

        return Response(
            {
                "count": total,
                "results": data,
                "next_cursor": offset + per_page if offset + per_page < total else None,
            },
            status=status.HTTP_200_OK,
        )
