# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from plane.db.models import User, WorkspaceMember, WorkReport
from plane.app.permissions.workspace import Member


@pytest.fixture
def member_user(db):
    user = User.objects.create(
        email="member-wr@plane.test",
        username="member_wr_user",
        first_name="Mem",
        last_name="Ber",
    )
    user.set_password("pass12345")
    user.save()
    return user


@pytest.fixture
def workspace_with_roles(workspace, create_user, member_user):
    WorkspaceMember.objects.create(workspace=workspace, member=member_user, role=Member, is_active=True)
    return workspace, create_user, member_user


@pytest.mark.contract
@pytest.mark.django_db
class TestWorkReportAPI:
    def test_owner_can_get_daily_report(self, session_client, workspace_with_roles):
        workspace, _, _ = workspace_with_roles
        url = reverse("workspace-work-reports", kwargs={"slug": workspace.slug})
        response = session_client.get(
            url,
            {"type": "daily", "period_date": "2026-04-07"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["report_type"] == "daily"
        assert response.data["period_start"] == "2026-04-07"
        assert "auto_summary" in response.data
        assert "by_project" in response.data["auto_summary"]
        assert WorkReport.objects.filter(workspace=workspace).count() == 1

    def test_admin_can_view_other_user_report(self, session_client, workspace_with_roles):
        workspace, _, member_user = workspace_with_roles
        url = reverse("workspace-work-reports", kwargs={"slug": workspace.slug})
        response = session_client.get(
            url,
            {"type": "daily", "period_date": "2026-04-07", "user_id": str(member_user.id)},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["owner"] == str(member_user.id)

    def test_member_cannot_view_other_report(self, workspace_with_roles, member_user):
        workspace, admin_user, _ = workspace_with_roles
        client = APIClient()
        client.force_authenticate(user=member_user)
        url = reverse("workspace-work-reports", kwargs={"slug": workspace.slug})
        response = client.get(
            url,
            {"type": "daily", "period_date": "2026-04-07", "user_id": str(admin_user.id)},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_can_patch_notes(self, session_client, workspace_with_roles):
        workspace, _, _ = workspace_with_roles
        url = reverse("workspace-work-reports", kwargs={"slug": workspace.slug})
        get_res = session_client.get(
            url,
            {"type": "weekly", "period_date": "2026-04-07"},
        )
        assert get_res.status_code == status.HTTP_200_OK
        report_id = get_res.data["id"]
        patch_url = reverse(
            "workspace-work-report-detail",
            kwargs={"slug": workspace.slug, "pk": report_id},
        )
        patch_res = session_client.patch(patch_url, {"notes": "My week notes"}, format="json")
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data["notes"] == "My week notes"

    def test_admin_cannot_patch_others_notes(self, session_client, workspace_with_roles):
        workspace, _, member_user = workspace_with_roles
        url = reverse("workspace-work-reports", kwargs={"slug": workspace.slug})
        get_res = session_client.get(
            url,
            {"type": "daily", "period_date": "2026-04-08", "user_id": str(member_user.id)},
        )
        report_id = get_res.data["id"]
        patch_url = reverse(
            "workspace-work-report-detail",
            kwargs={"slug": workspace.slug, "pk": report_id},
        )
        patch_res = session_client.patch(patch_url, {"notes": "hijack"}, format="json")
        assert patch_res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.contract
@pytest.mark.django_db
class TestDailyTeamDigestAPI:
    def test_admin_can_get_daily_team_digest(self, session_client, workspace_with_roles):
        workspace, _, member_user = workspace_with_roles
        url = reverse("workspace-daily-team-digest", kwargs={"slug": workspace.slug})
        response = session_client.get(url, {"period_date": "2026-04-07"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["period_start"] == "2026-04-07"
        assert response.data["period_end"] == "2026-04-07"
        assert "users" in response.data
        user_ids = {u["user_id"] for u in response.data["users"]}
        assert str(member_user.id) in user_ids
        for row in response.data["users"]:
            assert "display_name" in row
            assert "auto_summary" in row
            assert "by_project" in row["auto_summary"]

    def test_member_cannot_get_daily_team_digest(self, workspace_with_roles, member_user):
        workspace, _, _ = workspace_with_roles
        client = APIClient()
        client.force_authenticate(user=member_user)
        url = reverse("workspace-daily-team-digest", kwargs={"slug": workspace.slug})
        response = client.get(url, {"period_date": "2026-04-07"})
        assert response.status_code == status.HTTP_403_FORBIDDEN
