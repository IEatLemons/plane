/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IDefect } from "@plane/types";

export type TryCreateDefectForTaskResult =
  | { ok: true; defect: IDefect }
  | { ok: false; reason: "empty_name" }
  | { ok: false; reason: "create_failed"; error: unknown };

export async function tryCreateDefectForTask(args: {
  name: string;
  taskId?: string | null;
  create: (payload: { name: string; task_id?: string }) => Promise<IDefect>;
}): Promise<TryCreateDefectForTaskResult> {
  const trimmed = args.name.trim();
  if (!trimmed) return { ok: false, reason: "empty_name" };
  try {
    const payload: { name: string; task_id?: string } = { name: trimmed };
    if (args.taskId) payload.task_id = args.taskId;
    const defect = await args.create(payload);
    return { ok: true, defect };
  } catch (error) {
    return { ok: false, reason: "create_failed", error };
  }
}
