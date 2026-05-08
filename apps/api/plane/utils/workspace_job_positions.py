# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

WORKSPACE_JOB_POSITION_SLUGS = frozenset(
    (
        "project_manager",
        "product_manager",
        "developer",
        "ui_designer",
        "qa",
        "operations",
    )
)


def normalize_job_positions(raw):
    """Validate and dedupe job position slugs; returns list or raises ValueError."""
    if raw is None:
        return []
    if not isinstance(raw, (list, tuple)):
        raise ValueError("job_positions must be a list")
    out = []
    seen = set()
    for item in raw:
        if not isinstance(item, str):
            raise ValueError("job_positions entries must be strings")
        slug = item.strip()
        if slug not in WORKSPACE_JOB_POSITION_SLUGS:
            raise ValueError(f"Invalid job position: {item!r}")
        if slug not in seen:
            seen.add(slug)
            out.append(slug)
    return out
