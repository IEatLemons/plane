# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

from django.http import QueryDict

from plane.utils.issue_filters import issue_filters


def test_has_parent_true_filter():
    q = QueryDict("has_parent=true")
    f = issue_filters(q, "GET")
    assert f.get("parent__isnull") is False


def test_has_parent_false_filter():
    q = QueryDict("has_parent=false")
    f = issue_filters(q, "GET")
    assert f.get("parent__isnull") is True


def test_has_parent_omitted_when_param_absent():
    q = QueryDict()
    f = issue_filters(q, "GET")
    assert "parent__isnull" not in f
