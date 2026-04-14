/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssue, TIssuePriorities } from "@plane/types";

/** One row parsed from batch JSON (before createIssuePayload / API). */
export type TBatchIssueDraft = {
  name: string;
  description_html?: string;
  priority?: TIssuePriorities;
  state_id?: string;
  assignee_ids?: string[];
  label_ids?: string[];
  start_date?: string | null;
  target_date?: string | null;
};

const VALID_PRIORITIES: readonly TIssuePriorities[] = ["urgent", "high", "medium", "low", "none"];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function parseUuidArray(value: unknown, field: string, index: number): string[] | string {
  if (!Array.isArray(value)) {
    return `Item ${index + 1}: "${field}" must be an array of strings`;
  }
  for (const el of value) {
    if (typeof el !== "string") {
      return `Item ${index + 1}: "${field}" must be an array of strings`;
    }
  }
  return value as string[];
}

/** Returns error message, or null when value is valid (including null). */
function parseOptionalDateField(value: unknown, field: string, index: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    return `Item ${index + 1}: "${field}" must be a string or null`;
  }
  return null;
}

function parseItem(raw: unknown, index: number): TBatchIssueDraft | string {
  if (!isPlainObject(raw)) {
    return `Item ${index + 1}: expected an object`;
  }
  const nameVal = raw.name;
  if (typeof nameVal !== "string" || !nameVal.trim()) {
    return `Item ${index + 1}: "name" is required and must be a non-empty string`;
  }

  const draft: TBatchIssueDraft = { name: nameVal.trim() };

  if ("description_html" in raw && raw.description_html !== undefined) {
    if (typeof raw.description_html !== "string") {
      return `Item ${index + 1}: "description_html" must be a string`;
    }
    draft.description_html = raw.description_html;
  }

  if ("priority" in raw && raw.priority !== undefined) {
    if (typeof raw.priority !== "string" || !VALID_PRIORITIES.includes(raw.priority as TIssuePriorities)) {
      return `Item ${index + 1}: "priority" must be one of: ${VALID_PRIORITIES.join(", ")}`;
    }
    draft.priority = raw.priority as TIssuePriorities;
  }

  if ("state_id" in raw && raw.state_id !== undefined && raw.state_id !== null) {
    if (typeof raw.state_id !== "string") {
      return `Item ${index + 1}: "state_id" must be a string`;
    }
    draft.state_id = raw.state_id;
  }

  if ("assignee_ids" in raw && raw.assignee_ids !== undefined) {
    const ids = parseUuidArray(raw.assignee_ids, "assignee_ids", index);
    if (typeof ids === "string") return ids;
    draft.assignee_ids = ids;
  }

  if ("label_ids" in raw && raw.label_ids !== undefined) {
    const ids = parseUuidArray(raw.label_ids, "label_ids", index);
    if (typeof ids === "string") return ids;
    draft.label_ids = ids;
  }

  if ("start_date" in raw) {
    const err = parseOptionalDateField(raw.start_date, "start_date", index);
    if (err) return err;
    draft.start_date =
      raw.start_date === undefined ? undefined : raw.start_date === null ? null : (raw.start_date as string);
  }

  if ("target_date" in raw) {
    const err = parseOptionalDateField(raw.target_date, "target_date", index);
    if (err) return err;
    draft.target_date =
      raw.target_date === undefined ? undefined : raw.target_date === null ? null : (raw.target_date as string);
  }

  return draft;
}

export type TParseBatchIssueJsonResult = { ok: true; items: TBatchIssueDraft[] } | { ok: false; error: string };

/**
 * Parse pasted JSON into draft rows. Accepts either `[{...}]` or `{ "items": [...] }`.
 */
export function parseBatchIssueJson(jsonText: string): TParseBatchIssueJsonResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  let itemsRaw: unknown[];
  if (Array.isArray(parsed)) {
    itemsRaw = parsed;
  } else if (isPlainObject(parsed) && Array.isArray(parsed.items)) {
    itemsRaw = parsed.items;
  } else {
    return { ok: false, error: 'Expected a JSON array or an object with an "items" array' };
  }

  if (itemsRaw.length === 0) {
    return { ok: false, error: "The list is empty" };
  }

  const items: TBatchIssueDraft[] = [];
  for (let i = 0; i < itemsRaw.length; i++) {
    const row = parseItem(itemsRaw[i], i);
    if (typeof row === "string") {
      return { ok: false, error: row };
    }
    items.push(row);
  }

  return { ok: true, items };
}

/**
 * Merge a draft with defaults for {@link createIssuePayload}. `defaultStateId` must be set when the draft has no `state_id`.
 */
export function mergeBatchDraftForCreate(draft: TBatchIssueDraft, defaultStateId: string): Partial<TIssue> {
  return {
    name: draft.name,
    description_html: draft.description_html ?? "<p></p>",
    priority: draft.priority ?? "none",
    state_id: draft.state_id ?? defaultStateId,
    assignee_ids: draft.assignee_ids ?? [],
    label_ids: draft.label_ids ?? [],
    start_date: draft.start_date ?? null,
    target_date: draft.target_date ?? null,
  };
}
