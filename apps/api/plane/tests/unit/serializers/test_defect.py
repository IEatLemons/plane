# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only

import pytest

from plane.app.serializers.defect import DefectSerializer
from plane.db.models import Defect, Issue, Project, User, Workspace, WorkspaceMember


@pytest.mark.unit
class TestDefectSerializer:
    @pytest.mark.django_db
    def test_validate_task_accepts_draft_issue(self):
        """Draft issues are excluded from Issue.issue_objects but remain valid FK parents."""
        user = User.objects.create(email="draft-owner@plane.test", first_name="A", last_name="B")
        workspace = Workspace.objects.create(name="W", slug="w-draft", owner=user)
        WorkspaceMember.objects.create(workspace=workspace, member=user, role=20)
        project = Project.objects.create(name="P", identifier="PD", workspace=workspace)
        issue = Issue.objects.create(
            name="Draft task",
            workspace=workspace,
            project=project,
            is_draft=True,
        )
        assert not Issue.issue_objects.filter(pk=issue.pk).exists()

        serializer = DefectSerializer(
            data={
                "name": "Bug on draft",
                "task_id": str(issue.id),
            },
            context={"project_id": str(project.id), "slug": workspace.slug},
        )
        assert serializer.is_valid(), serializer.errors

    @pytest.mark.django_db
    def test_strip_client_id_blank_on_create(self):
        user = User.objects.create(email="u2@plane.test", first_name="C", last_name="D")
        workspace = Workspace.objects.create(name="W2", slug="w2-draft", owner=user)
        WorkspaceMember.objects.create(workspace=workspace, member=user, role=20)
        project = Project.objects.create(name="P2", identifier="P2", workspace=workspace)
        issue = Issue.objects.create(name="Task", workspace=workspace, project=project)

        serializer = DefectSerializer(
            data={
                "name": "x",
                "task_id": str(issue.id),
                "id": "",
                "description_json": None,
            },
            context={"project_id": str(project.id), "slug": workspace.slug},
        )
        assert serializer.is_valid(), serializer.errors

    @pytest.mark.django_db
    def test_create_without_task(self):
        user = User.objects.create(email="orphan-defect@plane.test", first_name="A", last_name="B")
        workspace = Workspace.objects.create(name="W3", slug="w3-orphan", owner=user)
        WorkspaceMember.objects.create(workspace=workspace, member=user, role=20)
        project = Project.objects.create(name="P3", identifier="P3O", workspace=workspace)

        serializer = DefectSerializer(
            data={"name": "Unlinked defect"},
            context={"project_id": str(project.id), "slug": workspace.slug},
        )
        assert serializer.is_valid(), serializer.errors
        serializer.save(project_id=project.id, disable_auto_set_user=True)
        defect = Defect.objects.get(project=project, name="Unlinked defect")
        assert defect.task_id is None
