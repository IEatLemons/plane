/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssue } from "@plane/types";

/**
 * Keeps only Gantt "root" rows from a flat issue id list: sub-work items whose parent is
 * present in the same store are excluded so they appear only under an expanded parent
 * (`buildGanttOrderedBlockIds`).
 *
 * Preserves order. If an id has no issue payload, the id is kept.
 * If an issue has a parent_id but the parent is not in the map, the row is kept (orphan).
 */
export function filterGanttRootIssueIds(
  orderedIds: string[],
  getIssueById: (id: string) => TIssue | undefined
): string[] {
  const out: string[] = [];

  for (const id of orderedIds) {
    const issue = getIssueById(id);
    if (!issue) {
      out.push(id);
      continue;
    }
    const parentId = issue.parent_id;
    if (!parentId) {
      out.push(id);
      continue;
    }
    if (getIssueById(parentId)) {
      continue;
    }
    out.push(id);
  }

  return out;
}
