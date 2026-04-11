# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.conf import settings
from django.db import models

from .base import BaseModel


class WorkReport(BaseModel):
    class ReportType(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"

    workspace = models.ForeignKey("db.Workspace", on_delete=models.CASCADE, related_name="work_reports")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="work_reports",
    )
    report_type = models.CharField(max_length=16, choices=ReportType.choices)
    period_start = models.DateField()
    period_end = models.DateField()
    notes = models.TextField(blank=True, default="")
    auto_summary = models.JSONField(default=dict)
    auto_summary_generated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "work_reports"
        verbose_name = "Work Report"
        verbose_name_plural = "Work Reports"
        ordering = ("-period_start", "-report_type")
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "owner", "report_type", "period_start"],
                condition=models.Q(deleted_at__isnull=True),
                name="work_report_unique_workspace_owner_type_period",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.report_type} {self.period_start} ({self.owner_id})"
