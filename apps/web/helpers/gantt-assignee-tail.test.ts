/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, it } from "vitest";
import type { TIssue } from "@plane/types";
import { computeShowGanttAssigneeTail } from "./gantt-assignee-tail";

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
    project_id: null,
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

describe("computeShowGanttAssigneeTail", () => {
  it("returns false when fewer than two distinct assignees across visible blocks", () => {
    const map: Record<string, TIssue | undefined> = {
      a: issue({ id: "a", assignee_ids: ["u1"] }),
      b: issue({ id: "b", assignee_ids: ["u1"] }),
    };
    expect(computeShowGanttAssigneeTail(["a", "b"], (id) => map[id])).toBe(false);
  });

  it("returns true when at least two distinct assignees appear", () => {
    const map: Record<string, TIssue | undefined> = {
      a: issue({ id: "a", assignee_ids: ["u1"] }),
      b: issue({ id: "b", assignee_ids: ["u2"] }),
    };
    expect(computeShowGanttAssigneeTail(["a", "b"], (id) => map[id])).toBe(true);
  });

  it("merges assignees from multiple assignee_ids on one issue", () => {
    const map: Record<string, TIssue | undefined> = {
      a: issue({ id: "a", assignee_ids: ["u1", "u2"] }),
    };
    expect(computeShowGanttAssigneeTail(["a"], (id) => map[id])).toBe(true);
  });

  it("ignores unassigned issues for the count", () => {
    const map: Record<string, TIssue | undefined> = {
      a: issue({ id: "a", assignee_ids: [] }),
      b: issue({ id: "b", assignee_ids: ["u1"] }),
    };
    expect(computeShowGanttAssigneeTail(["a", "b"], (id) => map[id])).toBe(false);
  });
});
