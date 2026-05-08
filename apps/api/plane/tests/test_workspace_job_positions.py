# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

import pytest

from plane.utils.workspace_job_positions import normalize_job_positions


def test_normalize_job_positions_dedupes():
    out = normalize_job_positions(["developer", "qa", "developer"])
    assert out == ["developer", "qa"]


def test_normalize_job_positions_rejects_invalid():
    with pytest.raises(ValueError, match="Invalid"):
        normalize_job_positions(["not_a_role"])
