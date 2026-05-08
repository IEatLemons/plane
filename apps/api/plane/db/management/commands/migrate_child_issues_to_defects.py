# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.core.management.base import BaseCommand

# Module imports
from plane.db.models import Defect, Issue


class Command(BaseCommand):
    help = "Create Defect rows from existing Issues that have a parent (one-time migration)."

    def add_arguments(self, parser):
        parser.add_argument("--workspace-slug", type=str, default=None, help="Limit to this workspace slug")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print how many issues would be migrated without writing",
        )

    def handle(self, *args, **options):
        slug = options.get("workspace_slug")
        dry_run = options.get("dry_run", False)

        qs = Issue.issue_objects.filter(parent_id__isnull=False).select_related("project", "parent", "workspace")
        if slug:
            qs = qs.filter(workspace__slug=slug)

        count = qs.count()
        self.stdout.write(self.style.NOTICE(f"Candidate child issues: {count}"))

        created = 0
        skipped = 0

        for issue in qs.iterator(chunk_size=500):
            if Defect.objects.filter(task_id=issue.parent_id, project_id=issue.project_id, name=issue.name).exists():
                skipped += 1
                continue
            if dry_run:
                created += 1
                continue
            defect = Defect(
                project_id=issue.project_id,
                task_id=issue.parent_id,
                name=issue.name,
                priority=issue.priority,
                state_id=issue.state_id,
                description_json=issue.description_json or {},
                description_html=issue.description_html or "<p></p>",
            )
            defect.save(disable_auto_set_user=True, created_by_id=issue.created_by_id)
            created += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run: would create {created} defects ({skipped} skipped as duplicates)."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Created {created} defects ({skipped} skipped as duplicates)."))
