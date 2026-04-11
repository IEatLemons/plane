# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("db", "0120_issueview_archived_at"),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkReport",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Created At"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Last Modified At"),
                ),
                (
                    "deleted_at",
                    models.DateTimeField(blank=True, null=True, verbose_name="Deleted At"),
                ),
                (
                    "id",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Created By",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated_by",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Last Modified By",
                    ),
                ),
                (
                    "report_type",
                    models.CharField(
                        choices=[("daily", "Daily"), ("weekly", "Weekly")],
                        max_length=16,
                    ),
                ),
                ("period_start", models.DateField()),
                ("period_end", models.DateField()),
                ("notes", models.TextField(blank=True, default="")),
                ("auto_summary", models.JSONField(default=dict)),
                (
                    "auto_summary_generated_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="work_reports",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="work_reports",
                        to="db.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Work Report",
                "verbose_name_plural": "Work Reports",
                "db_table": "work_reports",
                "ordering": ("-period_start", "-report_type"),
            },
        ),
        migrations.AddConstraint(
            model_name="workreport",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("workspace", "owner", "report_type", "period_start"),
                name="work_report_unique_workspace_owner_type_period",
            ),
        ),
    ]
