/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, it } from "vitest";
import { resolveProfileIssuesViewId } from "../core/hooks/resolve-profile-issues-view-id";

describe("resolveProfileIssuesViewId", () => {
  it("prefers URL param when a string is present", () => {
    expect(resolveProfileIssuesViewId("created", "assigned")).toBe("created");
  });

  it("uses first array segment when param is an array", () => {
    expect(resolveProfileIssuesViewId(["subscribed", "extra"], "assigned")).toBe("subscribed");
  });

  it("falls back to currentView when param is undefined", () => {
    expect(resolveProfileIssuesViewId(undefined, "created")).toBe("created");
  });
});
