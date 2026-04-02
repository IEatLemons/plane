/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import { getStableProjectAccentColor } from "./stable-project-accent";

const HSL_RE = /^hsl\(\d{1,3}, \d{1,3}%, \d{1,3}%\)$/;

describe("getStableProjectAccentColor", () => {
  it("returns undefined for empty id", () => {
    expect(getStableProjectAccentColor(undefined)).toBeUndefined();
    expect(getStableProjectAccentColor(null)).toBeUndefined();
    expect(getStableProjectAccentColor("")).toBeUndefined();
  });

  it("returns the same color for the same project id", () => {
    const id = "a1b2c3-project-uuid";
    const a = getStableProjectAccentColor(id);
    const b = getStableProjectAccentColor(id);
    expect(a).toBe(b);
    expect(a).toMatch(HSL_RE);
  });

  it("returns hsl for any non-empty id", () => {
    const c = getStableProjectAccentColor("any-project-id");
    expect(c).toBeDefined();
    expect(c).toMatch(HSL_RE);
  });

  it("usually assigns different hues to different ids", () => {
    const u1 = "11111111-1111-4111-8111-111111111111";
    const u2 = "22222222-2222-4222-8222-222222222222";
    expect(getStableProjectAccentColor(u1)).not.toBe(getStableProjectAccentColor(u2));
  });
});
