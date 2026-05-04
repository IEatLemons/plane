/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, it } from "vitest";
import type { TIssue } from "@plane/types";
import {
  buildGanttOrderedBlockIds,
  sortGanttSiblingIssueIds,
} from "../core/components/issues/issue-layouts/gantt/build-gantt-block-ids";

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

describe("sortGanttSiblingIssueIds", () => {
  it("sorts by start_date ascending", () => {
    const map = {
      a: issue({ id: "a", start_date: "2025-02-01", sort_order: 0 }),
      b: issue({ id: "b", start_date: "2025-01-01", sort_order: 0 }),
      c: issue({ id: "c", start_date: "2025-01-15", sort_order: 0 }),
    } as Record<string, TIssue | undefined>;
    expect(sortGanttSiblingIssueIds(["a", "b", "c"], (id) => map[id])).toEqual(["b", "c", "a"]);
  });

  it("places issues without start_date after dated issues", () => {
    const map = {
      early: issue({ id: "early", start_date: "2025-01-01", sort_order: 0 }),
      undated: issue({ id: "undated", start_date: null, sort_order: 0 }),
    } as Record<string, TIssue | undefined>;
    expect(sortGanttSiblingIssueIds(["undated", "early"], (id) => map[id])).toEqual(["early", "undated"]);
  });

  it("uses sort_order when start_date ties", () => {
    const map = {
      second: issue({ id: "second", start_date: "2025-01-01", sort_order: 20 }),
      first: issue({ id: "first", start_date: "2025-01-01", sort_order: 10 }),
    } as Record<string, TIssue | undefined>;
    expect(sortGanttSiblingIssueIds(["second", "first"], (id) => map[id])).toEqual(["first", "second"]);
  });
});

describe("buildGanttOrderedBlockIds", () => {
  it("walks grouped children sorted by schedule", () => {
    const mockStore = {
      subIssuesByIssueId(parentId: string): string[] | undefined {
        if (parentId === "root") return ["mid", "early", "late"];
        return undefined;
      },
    };
    const map = {
      root: issue({ id: "root", start_date: "2025-03-01" }),
      early: issue({ id: "early", start_date: "2025-01-01" }),
      mid: issue({ id: "mid", start_date: "2025-02-01" }),
      late: issue({ id: "late", start_date: "2025-04-01" }),
    } as Record<string, TIssue | undefined>;
    const expanded = new Set<string>(["root"]);
    expect(buildGanttOrderedBlockIds(["root"], expanded, mockStore, (id) => map[id])).toEqual([
      "root",
      "early",
      "mid",
      "late",
    ]);
  });
});
