# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.core.exceptions import ValidationError
from django.db import connection, models, transaction
from django.utils import timezone

# Module imports
from plane.utils.html_processor import strip_tags
from plane.utils.uuid import convert_uuid_to_integer
from .project import ProjectBaseModel


class Defect(ProjectBaseModel):
    """Independent defect record scoped to a project; may optionally link to a task (Issue)."""

    PRIORITY_CHOICES = (
        ("urgent", "Urgent"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
        ("none", "None"),
    )
    task = models.ForeignKey(
        "db.Issue",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="defects",
    )
    state = models.ForeignKey(
        "db.State",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="defect_state",
    )
    name = models.CharField(max_length=255, verbose_name="Defect Name")
    description_json = models.JSONField(blank=True, default=dict)
    description_html = models.TextField(blank=True, default="<p></p>")
    description_stripped = models.TextField(blank=True, null=True)
    priority = models.CharField(
        max_length=30,
        choices=PRIORITY_CHOICES,
        verbose_name="Defect Priority",
        default="none",
    )
    sequence_id = models.IntegerField(default=1, verbose_name="Defect Sequence ID")
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Defect"
        verbose_name_plural = "Defects"
        db_table = "defects"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.name} <{self.project.name}>"

    def clean(self):
        if self.task_id and self.project_id and self.task.project_id != self.project_id:
            raise ValidationError({"task": "Task must belong to the same project as the defect."})
        if self.state_id and self.project_id and self.state.project_id != self.project_id:
            raise ValidationError({"state": "State must belong to the same project as the defect."})

    def save(self, *args, **kwargs):
        from plane.db.models import State

        self.clean()
        if self.state is None and self.project_id:
            try:
                default_state = State.objects.filter(
                    ~models.Q(is_triage=True), project=self.project, default=True
                ).first()
                if default_state is None:
                    random_state = State.objects.filter(~models.Q(is_triage=True), project=self.project).first()
                    self.state = random_state
                else:
                    self.state = default_state
            except ImportError:
                pass

        try:
            if self.state and self.state.group == "completed":
                self.completed_at = timezone.now()
            else:
                self.completed_at = None
        except ImportError:
            pass

        self.description_stripped = (
            None
            if (self.description_html == "" or self.description_html is None)
            else strip_tags(self.description_html)
        )

        if self._state.adding:
            with transaction.atomic():
                lock_key = convert_uuid_to_integer(self.project_id)
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_key])
                last_sequence = Defect.objects.filter(project=self.project).aggregate(models.Max("sequence_id"))[
                    "sequence_id__max"
                ]
                self.sequence_id = last_sequence + 1 if last_sequence else 1
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
