# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import serializers

# Module imports
from plane.db.models import Defect, Issue


class DefectSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is None:
            self.fields["task_id"].required = True

    class Meta:
        model = Defect
        fields = (
            "id",
            "name",
            "sequence_id",
            "priority",
            "state_id",
            "description_html",
            "description_json",
            "task_id",
            "project_id",
            "created_at",
            "updated_at",
            "completed_at",
        )
        read_only_fields = ("id", "sequence_id", "project_id", "created_at", "updated_at", "completed_at")

    def validate_task_id(self, value):
        project_id = self.context.get("project_id")
        slug = self.context.get("slug")
        if not project_id or not slug:
            return value
        if not Issue.issue_objects.filter(id=value, project_id=project_id, workspace__slug=slug).exists():
            raise serializers.ValidationError("Task not found in this project.")
        return value


class DefectDetailSerializer(DefectSerializer):
    task_name = serializers.CharField(source="task.name", read_only=True)
    task_sequence_id = serializers.IntegerField(source="task.sequence_id", read_only=True)
    project_identifier = serializers.CharField(source="project.identifier", read_only=True)

    class Meta(DefectSerializer.Meta):
        fields = DefectSerializer.Meta.fields + ("task_name", "task_sequence_id", "project_identifier")
