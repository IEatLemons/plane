# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ROLE, allow_permission
from plane.app.serializers.defect import DefectDetailSerializer, DefectSerializer
from plane.app.views import BaseAPIView
from plane.db.models import Defect, Project, ProjectMember


def defects_for_project(request, slug, project_id):
    queryset = (
        Defect.objects.filter(
            workspace__slug=slug,
            project_id=project_id,
            project__archived_at__isnull=True,
            project__deleted_at__isnull=True,
        )
        .select_related("task", "state", "project")
        .order_by("-created_at")
    )
    project = Project.objects.filter(pk=project_id, workspace__slug=slug).first()
    if not project:
        return queryset.none()
    guest_qs = ProjectMember.objects.filter(
        workspace__slug=slug,
        project_id=project_id,
        member=request.user,
        role=ROLE.GUEST.value,
        is_active=True,
    )
    if guest_qs.exists() and not project.guest_view_all_features:
        queryset = queryset.filter(created_by=request.user)
    return queryset


class DefectListCreateEndpoint(BaseAPIView):
    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id):
        queryset = defects_for_project(request, slug, project_id)
        task_param = request.GET.get("task_id")
        if task_param:
            queryset = queryset.filter(task_id=task_param)
        serializer = DefectDetailSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def post(self, request, slug, project_id):
        serializer = DefectSerializer(
            data=request.data,
            context={"project_id": str(project_id), "slug": slug},
        )
        if serializer.is_valid():
            serializer.save(project_id=project_id)
            detail = DefectDetailSerializer(
                Defect.objects.select_related("task", "state", "project").get(pk=serializer.instance.pk)
            )
            return Response(detail.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DefectDetailEndpoint(BaseAPIView):
    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def get(self, request, slug, project_id, defect_id):
        defect = defects_for_project(request, slug, project_id).filter(pk=defect_id).first()
        if not defect:
            return Response({"error": "Defect not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(DefectDetailSerializer(defect).data, status=status.HTTP_200_OK)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def patch(self, request, slug, project_id, defect_id):
        defect = defects_for_project(request, slug, project_id).filter(pk=defect_id).first()
        if not defect:
            return Response({"error": "Defect not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = DefectSerializer(
            defect,
            data=request.data,
            partial=True,
            context={"project_id": str(project_id), "slug": slug},
        )
        if serializer.is_valid():
            serializer.save()
            defect.refresh_from_db()
            return Response(DefectDetailSerializer(defect).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @allow_permission(allowed_roles=[ROLE.ADMIN, ROLE.MEMBER, ROLE.GUEST])
    def delete(self, request, slug, project_id, defect_id):
        defect = defects_for_project(request, slug, project_id).filter(pk=defect_id).first()
        if not defect:
            return Response({"error": "Defect not found"}, status=status.HTTP_404_NOT_FOUND)
        defect.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
