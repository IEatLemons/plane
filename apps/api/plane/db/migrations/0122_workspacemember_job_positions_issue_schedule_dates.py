# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.db import migrations, models


def add_evaluating_states(apps, schema_editor):
    State = apps.get_model("db", "State")
    Project = apps.get_model("db", "Project")
    evaluating_name = "Evaluating"
    for project in Project.objects.filter(archived_at__isnull=True).only("id", "workspace_id"):
        exists = State.objects.filter(
            project_id=project.id,
            name=evaluating_name,
            deleted_at__isnull=True,
        ).exists()
        if exists:
            continue
        State.objects.create(
            name=evaluating_name,
            description="",
            color="#6366f1",
            sequence=30000.0,
            group="unstarted",
            is_triage=False,
            default=False,
            project_id=project.id,
            workspace_id=project.workspace_id,
        )


def noop_reverse(apps, schema_editor):
    State = apps.get_model("db", "State")
    State.objects.filter(name="Evaluating", group="unstarted", deleted_at__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0121_work_report"),
    ]

    operations = [
        migrations.AddField(
            model_name="workspacemember",
            name="job_positions",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="issue",
            name="initial_target_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issue",
            name="evaluated_target_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issueversion",
            name="initial_target_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="issueversion",
            name="evaluated_target_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="draftissue",
            name="initial_target_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="draftissue",
            name="evaluated_target_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.RunPython(add_evaluating_states, noop_reverse),
    ]
