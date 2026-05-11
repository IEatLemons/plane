# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Third party imports
from rest_framework import serializers

# Module imports
from plane.db.models import Defect, Issue


class DefectSerializer(serializers.ModelSerializer):
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
        extra_kwargs = {
            "priority": {"required": False},
            "state_id": {"required": False, "allow_null": True},
            "description_html": {"required": False, "allow_null": True},
            "description_json": {"required": False, "allow_null": True},
            "task_id": {"required": False, "allow_null": True},
        }

    def to_internal_value(self, data):
        # Writable copies that drop server-controlled keys. Clients sometimes POST empty `id`,
        # which violates UUID parsing before read-only stripping runs.
        if hasattr(data, "copy"):
            mutable = data.copy()
        elif isinstance(data, dict):
            mutable = dict(data)
        else:
            return super().to_internal_value(data)
        for key in ("id", "sequence_id", "project_id", "created_at", "updated_at", "completed_at"):
            mutable.pop(key, None)
        return super().to_internal_value(mutable)

    def validate_description_json(self, value):
        if value is None:
            return {}
        return value

    def validate_state_id(self, value):
        if value in ("", None):
            return None
        return value

    def validate_task_id(self, value):
        if value is None:
            return value
        project_id = self.context.get("project_id")
        slug = self.context.get("slug")
        if not project_id or not slug:
            return value
        # Use Issue.objects (soft-delete only). Issue.issue_objects also hides drafts, triage rows,
        # and archived issues, which users can still open as detail/parent contexts.
        if not Issue.objects.filter(id=value, project_id=project_id, workspace__slug=slug).exists():
            raise serializers.ValidationError("Task not found in this project.")
        return value


class DefectDetailSerializer(DefectSerializer):
    task_name = serializers.SerializerMethodField()
    task_sequence_id = serializers.SerializerMethodField()
    project_identifier = serializers.CharField(source="project.identifier", read_only=True)

    class Meta(DefectSerializer.Meta):
        fields = DefectSerializer.Meta.fields + ("task_name", "task_sequence_id", "project_identifier")

    def get_task_name(self, obj):
        return obj.task.name if obj.task_id else None

    def get_task_sequence_id(self, obj):
        return obj.task.sequence_id if obj.task_id else None
