/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { TIssue } from "@plane/types";

/**
 * Whether to show per-bar assignee decoration: only when the visible list includes
 * tasks assigned to at least two distinct users (assignee_ids union size ≥ 2).
 */
export function computeShowGanttAssigneeTail(
  blockIds: string[],
  getIssueById: (id: string) => TIssue | undefined
): boolean {
  const distinct = new Set<string>();
  for (const id of blockIds) {
    const issue = getIssueById(id);
    const ids = issue?.assignee_ids;
    if (!ids?.length) continue;
    for (const aid of ids) distinct.add(aid);
  }
  return distinct.size >= 2;
}
