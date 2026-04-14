/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it } from "vitest";
import { mergeBatchDraftForCreate, parseBatchIssueJson } from "./batch-issue-import";

describe("parseBatchIssueJson", () => {
  it("rejects invalid JSON", () => {
    const r = parseBatchIssueJson("{");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Invalid JSON");
  });

  it("accepts array form", () => {
    const r = parseBatchIssueJson(
      JSON.stringify([{ name: "A" }, { name: "B", priority: "low", description_html: "<p>x</p>" }])
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toEqual({ name: "A" });
    expect(r.items[1].name).toBe("B");
    expect(r.items[1].priority).toBe("low");
    expect(r.items[1].description_html).toBe("<p>x</p>");
  });

  it("accepts { items: [...] } form", () => {
    const r = parseBatchIssueJson(JSON.stringify({ items: [{ name: "X" }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items).toEqual([{ name: "X" }]);
  });

  it("rejects empty array", () => {
    const r = parseBatchIssueJson("[]");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("empty");
  });

  it("rejects missing name", () => {
    const r = parseBatchIssueJson(JSON.stringify([{}]));
    expect(r.ok).toBe(false);
  });

  it("rejects bad priority", () => {
    const r = parseBatchIssueJson(JSON.stringify([{ name: "n", priority: "mega" }]));
    expect(r.ok).toBe(false);
  });

  it("parses optional fields", () => {
    const r = parseBatchIssueJson(
      JSON.stringify([
        {
          name: "Full",
          state_id: "550e8400-e29b-41d4-a716-446655440000",
          assignee_ids: ["550e8400-e29b-41d4-a716-446655440001"],
          label_ids: [],
          start_date: "2026-04-01",
          target_date: null,
        },
      ])
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items).toHaveLength(1);
    expect(r.items[0].state_id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(r.items[0].assignee_ids).toEqual(["550e8400-e29b-41d4-a716-446655440001"]);
    expect(r.items[0].target_date).toBe(null);
  });
});

describe("mergeBatchDraftForCreate", () => {
  const defaultState = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  it("fills state_id from default when omitted", () => {
    const merged = mergeBatchDraftForCreate({ name: "T" }, defaultState);
    expect(merged.state_id).toBe(defaultState);
    expect(merged.description_html).toBe("<p></p>");
    expect(merged.priority).toBe("none");
    expect(merged.assignee_ids).toEqual([]);
    expect(merged.label_ids).toEqual([]);
  });

  it("keeps draft state_id when set", () => {
    const s = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const merged = mergeBatchDraftForCreate({ name: "T", state_id: s }, defaultState);
    expect(merged.state_id).toBe(s);
  });
});
