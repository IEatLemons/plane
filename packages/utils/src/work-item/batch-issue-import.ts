/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { addDays } from "date-fns/addDays";
import type { TIssue, TIssuePriorities } from "@plane/types";
import { renderFormattedPayloadDate } from "../datetime";

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
  /** Batch-local id for linking; required when using parent_import_key across rows. */
  import_key?: string;
  /** References another row's import_key; resolved to parent_id at publish time. */
  parent_import_key?: string;
  /** Existing work item UUID as parent (optional). */
  parent_id?: string | null;
  /** Per-row duration in days when applying sequential schedule (default: schedule.duration_days or 1). */
  duration_days?: number;
};

export type TBatchImportSchedule = {
  mode?: "sequential";
  step_days?: number;
  duration_days?: number;
  base_start?: string | null;
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

function parseScheduleField(raw: unknown): TBatchImportSchedule | string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isPlainObject(raw)) {
    return '"schedule" must be an object';
  }
  const schedule: TBatchImportSchedule = {};
  if ("mode" in raw && raw.mode !== undefined) {
    if (raw.mode !== "sequential") {
      return '"schedule.mode" must be "sequential"';
    }
    schedule.mode = "sequential";
  }
  if ("step_days" in raw && raw.step_days !== undefined) {
    if (typeof raw.step_days !== "number" || !Number.isInteger(raw.step_days) || raw.step_days < 0) {
      return '"schedule.step_days" must be a non-negative integer';
    }
    schedule.step_days = raw.step_days;
  }
  if ("duration_days" in raw && raw.duration_days !== undefined) {
    if (typeof raw.duration_days !== "number" || !Number.isInteger(raw.duration_days) || raw.duration_days < 1) {
      return '"schedule.duration_days" must be a positive integer';
    }
    schedule.duration_days = raw.duration_days;
  }
  if ("base_start" in raw && raw.base_start !== undefined && raw.base_start !== null) {
    if (typeof raw.base_start !== "string") {
      return '"schedule.base_start" must be a string or null';
    }
    schedule.base_start = raw.base_start;
  }
  return schedule;
}

function flattenWithChildren(
  itemsRaw: unknown[],
  out: Record<string, unknown>[],
  inheritedParentKey?: string
): string | void {
  for (let i = 0; i < itemsRaw.length; i++) {
    const raw = itemsRaw[i];
    if (!isPlainObject(raw)) {
      return `Item ${out.length + 1}: expected an object`;
    }
    const children = raw.children;
    const { children: _ch, ...rest } = raw;
    const row: Record<string, unknown> = { ...rest };
    if (inheritedParentKey !== undefined) {
      row.parent_import_key = row.parent_import_key ?? inheritedParentKey;
    }
    out.push(row);
    const importKey =
      typeof row.import_key === "string" && row.import_key.trim()
        ? (row.import_key as string).trim()
        : `auto-${out.length - 1}`;
    if (!row.import_key) {
      row.import_key = importKey;
    }
    if (Array.isArray(children)) {
      const err = flattenWithChildren(children, out, importKey);
      if (err) return err;
    }
  }
}

function parseItem(raw: unknown, index: number): TBatchIssueDraft | string {
  if (!isPlainObject(raw)) {
    return `Item ${index + 1}: expected an object`;
  }
  if ("children" in raw) {
    return `Item ${index + 1}: "children" is only allowed at the root items array level`;
  }
  const nameVal = raw.name;
  if (typeof nameVal !== "string" || !nameVal.trim()) {
    return `Item ${index + 1}: "name" is required and must be a non-empty string`;
  }

  const draft: TBatchIssueDraft = { name: nameVal.trim() };

  if ("import_key" in raw && raw.import_key !== undefined && raw.import_key !== null) {
    if (typeof raw.import_key !== "string" || !raw.import_key.trim()) {
      return `Item ${index + 1}: "import_key" must be a non-empty string`;
    }
    draft.import_key = raw.import_key.trim();
  }

  if ("parent_import_key" in raw && raw.parent_import_key !== undefined && raw.parent_import_key !== null) {
    if (typeof raw.parent_import_key !== "string" || !raw.parent_import_key.trim()) {
      return `Item ${index + 1}: "parent_import_key" must be a non-empty string`;
    }
    draft.parent_import_key = raw.parent_import_key.trim();
  }

  if ("parent_id" in raw && raw.parent_id !== undefined && raw.parent_id !== null) {
    if (typeof raw.parent_id !== "string") {
      return `Item ${index + 1}: "parent_id" must be a string`;
    }
    draft.parent_id = raw.parent_id;
  }

  if (draft.parent_id && draft.parent_import_key) {
    return `Item ${index + 1}: use only one of "parent_id" or "parent_import_key"`;
  }

  if ("duration_days" in raw && raw.duration_days !== undefined) {
    if (typeof raw.duration_days !== "number" || !Number.isInteger(raw.duration_days) || raw.duration_days < 1) {
      return `Item ${index + 1}: "duration_days" must be a positive integer`;
    }
    draft.duration_days = raw.duration_days;
  }

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

function ensureImportKeys(items: TBatchIssueDraft[]): void {
  const used = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    let k = items[i].import_key?.trim();
    if (!k) {
      k = `import-${i}`;
      items[i] = { ...items[i], import_key: k };
    }
    if (used.has(k)) {
      throw new Error(`duplicate import_key: ${k}`);
    }
    used.add(k);
  }
}

/** Topologically sort by parent_import_key; returns error message or null. */
export function orderBatchDraftsByParentDependency(items: TBatchIssueDraft[]): string | null {
  const hasParentRef = items.some((it) => !!it.parent_import_key);
  if (!hasParentRef) {
    return null;
  }

  try {
    ensureImportKeys(items);
  } catch (e) {
    return e instanceof Error ? e.message : "import_key error";
  }

  const keyToItem = new Map<string, TBatchIssueDraft>();
  for (const it of items) {
    keyToItem.set(it.import_key!, it);
  }

  for (const it of items) {
    if (it.parent_import_key && !keyToItem.has(it.parent_import_key)) {
      return `unknown parent_import_key: ${it.parent_import_key}`;
    }
  }

  const children = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const it of items) {
    const k = it.import_key!;
    if (!children.has(k)) children.set(k, []);
    indegree.set(k, indegree.get(k) ?? 0);
  }
  for (const it of items) {
    const k = it.import_key!;
    if (it.parent_import_key) {
      children.get(it.parent_import_key)!.push(k);
      indegree.set(k, (indegree.get(k) ?? 0) + 1);
    }
  }

  const queue = items.map((it) => it.import_key!).filter((k) => indegree.get(k) === 0);
  const sortedKeys: string[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    sortedKeys.push(n);
    for (const c of children.get(n) ?? []) {
      indegree.set(c, (indegree.get(c) ?? 0) - 1);
      if (indegree.get(c) === 0) queue.push(c);
    }
  }

  if (sortedKeys.length !== items.length) {
    return "cycle or invalid hierarchy in import_key / parent_import_key graph";
  }

  const ordered = sortedKeys.map((k) => keyToItem.get(k)!);
  items.splice(0, items.length, ...ordered);
  return null;
}

/**
 * Fill start_date / target_date for rows that have neither, using sequential scheduling.
 */
export function applySequentialScheduleToDrafts(
  items: TBatchIssueDraft[],
  schedule: TBatchImportSchedule | undefined
): TBatchIssueDraft[] {
  if (!schedule || schedule.mode !== "sequential") {
    return items;
  }
  const step = schedule.step_days ?? 1;
  const defaultDur = schedule.duration_days ?? 1;
  const base =
    schedule.base_start && typeof schedule.base_start === "string" ? new Date(schedule.base_start) : new Date();
  base.setHours(0, 0, 0, 0);

  return items.map((it, i) => {
    if (it.start_date != null || it.target_date != null) {
      return it;
    }
    const dur = it.duration_days ?? defaultDur;
    const start = addDays(base, i * step);
    const target = addDays(start, Math.max(0, dur - 1));
    const startStr = renderFormattedPayloadDate(start);
    const targetStr = renderFormattedPayloadDate(target);
    return {
      ...it,
      start_date: startStr ?? null,
      target_date: targetStr ?? null,
    };
  });
}

export type TParseBatchIssueJsonResult =
  | { ok: true; items: TBatchIssueDraft[]; schedule: TBatchImportSchedule | undefined }
  | { ok: false; error: string };

export type TParseBatchIssueJsonOptions = {
  /** When true (default), applies root-level `schedule` to fill missing dates. */
  applySchedule?: boolean;
};

/**
 * Parse pasted JSON into draft rows. Accepts either `[{...}]` or `{ "items": [...], "schedule"?: {...} }`.
 * Nested `children` arrays are flattened and wired with parent_import_key.
 */
export function parseBatchIssueJson(
  jsonText: string,
  options?: TParseBatchIssueJsonOptions
): TParseBatchIssueJsonResult {
  const applySchedule = options?.applySchedule !== false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }

  let itemsRaw: unknown[];
  let schedule: TBatchImportSchedule | undefined;

  if (Array.isArray(parsed)) {
    itemsRaw = parsed;
  } else if (isPlainObject(parsed) && Array.isArray(parsed.items)) {
    itemsRaw = parsed.items;
    if ("schedule" in parsed) {
      const s = parseScheduleField(parsed.schedule);
      if (typeof s === "string") {
        return { ok: false, error: s };
      }
      if (s && Object.keys(s).length) {
        schedule = { mode: "sequential", ...s };
      }
    }
  } else {
    return { ok: false, error: 'Expected a JSON array or an object with an "items" array' };
  }

  if (itemsRaw.length === 0) {
    return { ok: false, error: "The list is empty" };
  }

  const hasNestedChildren = itemsRaw.some(
    (x) => isPlainObject(x) && "children" in x && Array.isArray((x as Record<string, unknown>).children)
  );

  let flat: Record<string, unknown>[];
  if (hasNestedChildren) {
    flat = [];
    const flatErr = flattenWithChildren(itemsRaw, flat);
    if (flatErr) {
      return { ok: false, error: flatErr };
    }
  } else {
    flat = [];
    for (const x of itemsRaw) {
      if (!isPlainObject(x)) {
        return { ok: false, error: `Item ${flat.length + 1}: expected an object` };
      }
      flat.push({ ...x });
    }
  }

  const items: TBatchIssueDraft[] = [];
  for (let i = 0; i < flat.length; i++) {
    const row = parseItem(flat[i], i);
    if (typeof row === "string") {
      return { ok: false, error: row };
    }
    items.push(row);
  }

  const topoErr = orderBatchDraftsByParentDependency(items);
  if (topoErr) {
    return { ok: false, error: topoErr };
  }

  const finalItems = applySchedule ? applySequentialScheduleToDrafts(items, schedule) : items;

  return { ok: true, items: finalItems, schedule };
}

/**
 * Merge a draft with defaults for {@link createIssuePayload}. `defaultStateId` must be set when the draft has no `state_id`.
 * `resolvedParentId` overrides draft.parent_id when set (after resolving parent_import_key).
 */
export function mergeBatchDraftForCreate(
  draft: TBatchIssueDraft,
  defaultStateId: string,
  resolvedParentId?: string | null
): Partial<TIssue> {
  const parent_id = resolvedParentId !== undefined ? resolvedParentId : (draft.parent_id ?? null);

  return {
    name: draft.name,
    description_html: draft.description_html ?? "<p></p>",
    priority: draft.priority ?? "none",
    state_id: draft.state_id ?? defaultStateId,
    assignee_ids: draft.assignee_ids ?? [],
    label_ids: draft.label_ids ?? [],
    start_date: draft.start_date ?? null,
    target_date: draft.target_date ?? null,
    parent_id,
  };
}
