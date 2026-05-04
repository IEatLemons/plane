/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, it } from "vitest";
import type { TIssue } from "@plane/types";
import { filterGanttRootIssueIds } from "../core/components/issues/issue-layouts/gantt/filter-gantt-root-issue-ids";

const issue = (overrides: Partial<TIssue> & Pick<TIssue, "id">): TIssue =>
  ({
    sequence_id: 1,
    name: "t",
    sort_order: 0,
    state_id: null,
    priority: null,
    label_ids: [],
    assignee_ids: [],
    estimate_point: null,
    sub_issues_count: 0,
    attachment_count: 0,
    link_count: 0,
    project_id: "p",
    parent_id: null,
    cycle_id: null,
    module_ids: null,
    type_id: null,
    created_at: "",
    updated_at: "",
    start_date: null,
    target_date: null,
    completed_at: null,
    archived_at: null,
    created_by: "",
    updated_by: "",
    is_draft: false,
    ...overrides,
  }) as TIssue;

describe("filterGanttRootIssueIds", () => {
  it("keeps ids with no issue payload in the map", () => {
    const map = { a: issue({ id: "a" }) } as Record<string, TIssue | undefined>;
    expect(filterGanttRootIssueIds(["a", "missing"], (id) => map[id])).toEqual(["a", "missing"]);
  });

  it("drops child when parent is present, preserving relative order among kept roots", () => {
    const parent = issue({ id: "parent", name: "P" });
    const child = issue({ id: "child", name: "C", parent_id: "parent" });
    const other = issue({ id: "root2", name: "R", parent_id: null });
    const map: Record<string, TIssue> = {
      parent,
      child,
      root2: other,
    };
    expect(filterGanttRootIssueIds(["parent", "child", "root2"], (id) => map[id])).toEqual(["parent", "root2"]);
  });

  it("keeps sub-issue row when parent is not in map (orphan)", () => {
    const child = issue({ id: "child", parent_id: "absent-parent" });
    const map: Record<string, TIssue> = { child };
    expect(filterGanttRootIssueIds(["child"], (id) => map[id])).toEqual(["child"]);
  });

  it("does not reorder roots relative to filtered items", () => {
    const a = issue({ id: "a", parent_id: null });
    const b = issue({ id: "b", parent_id: null });
    const map: Record<string, TIssue> = { a, b };
    expect(filterGanttRootIssueIds(["b", "a"], (id) => map[id])).toEqual(["b", "a"]);
  });
});
