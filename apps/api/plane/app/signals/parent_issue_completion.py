# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""When all non-cancelled sub-issues are completed, mark the parent issue completed."""

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from plane.db.models import Issue, State
from plane.db.models.state import StateGroup


def try_complete_parent_issue(parent_id: str) -> None:
    parent = (
        Issue.issue_objects.filter(pk=parent_id)
        .select_related("state")
        .first()
    )
    if not parent or not parent.state:
        return
    if parent.state.group == StateGroup.COMPLETED.value:
        return

    children = list(
        Issue.issue_objects.filter(parent_id=parent_id).select_related("state")
    )
    if not children:
        return

    eligible = [c for c in children if c.state and c.state.group != StateGroup.CANCELLED.value]
    if not eligible:
        return

    if not all(c.state and c.state.group == StateGroup.COMPLETED.value for c in eligible):
        return

    completed_state = (
        State.objects.filter(project_id=parent.project_id, group=StateGroup.COMPLETED.value)
        .order_by("sequence")
        .first()
    )
    if not completed_state:
        return

    Issue.issue_objects.filter(pk=parent_id).update(
        state_id=completed_state.id,
        completed_at=timezone.now(),
    )

    grandparent_id = parent.parent_id
    if grandparent_id:
        gid = str(grandparent_id)
        transaction.on_commit(lambda g=gid: try_complete_parent_issue(g))


@receiver(post_save, sender=Issue)
def complete_parent_when_sub_issues_done(sender, instance, **kwargs):
    if kwargs.get("raw"):
        return
    if not instance.parent_id:
        return
    pid = str(instance.parent_id)
    transaction.on_commit(lambda: try_complete_parent_issue(pid))
