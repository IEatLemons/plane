/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, it } from "vitest";
import { COLLECTION_OPERATOR, COMPARISON_OPERATOR } from "@plane/types";
import { applyWorkspaceMemberAssigneeShortcutFromConditions } from "./workspace-quick-filters";

const assigneeIn = (userId: string) => ({
  property: "assignee_id" as const,
  operator: COLLECTION_OPERATOR.IN,
  value: userId,
});

describe("applyWorkspaceMemberAssigneeShortcutFromConditions", () => {
  it("adds assignee when none was set", () => {
    const out = applyWorkspaceMemberAssigneeShortcutFromConditions([], "user-a");
    expect(JSON.stringify(out)).toContain("user-a");
  });

  it("replaces assignee A with B", () => {
    const out = applyWorkspaceMemberAssigneeShortcutFromConditions([assigneeIn("user-a")], "user-b");
    expect(JSON.stringify(out)).toContain("user-b");
    expect(JSON.stringify(out)).not.toContain("user-a");
  });

  it("preserves non-assignee conditions when switching assignee", () => {
    const range = "2024-01-01;after,2024-01-31;before";
    const out = applyWorkspaceMemberAssigneeShortcutFromConditions(
      [
        {
          property: "target_date",
          operator: COMPARISON_OPERATOR.RANGE,
          value: range,
        },
        assigneeIn("user-a"),
      ],
      "user-b"
    );
    const s = JSON.stringify(out);
    expect(s).toContain("target_date");
    expect(s).toContain(range);
    expect(s).toContain("user-b");
    expect(s).not.toContain("user-a");
  });
});
