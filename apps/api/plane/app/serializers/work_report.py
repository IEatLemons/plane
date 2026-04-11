# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from rest_framework import serializers

from plane.db.models import WorkReport


class WorkReportSerializer(serializers.ModelSerializer):
    workspace = serializers.PrimaryKeyRelatedField(read_only=True)
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = WorkReport
        fields = (
            "id",
            "workspace",
            "owner",
            "report_type",
            "period_start",
            "period_end",
            "notes",
            "auto_summary",
            "auto_summary_generated_at",
            "created_at",
            "updated_at",
        )


class WorkReportNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkReport
        fields = ("notes",)
