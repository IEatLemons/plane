/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IIssueSubIssuesStore } from "@/store/issue/issue-details/sub_issues.store";

/**
 * DFS order for gantt rows: roots from the issues list first, then each expanded parent's
 * immediate children (order preserved from sub-issues store), recursively.
 */
export function buildGanttOrderedBlockIds(
  rootIds: string[],
  expandedParentIds: ReadonlySet<string>,
  subIssuesStore: Pick<IIssueSubIssuesStore, "subIssuesByIssueId">
): string[] {
  const out: string[] = [];

  const appendChildren = (parentId: string) => {
    const childIds = subIssuesStore.subIssuesByIssueId(parentId);
    if (!childIds?.length) return;
    for (const childId of childIds) {
      out.push(childId);
      if (expandedParentIds.has(childId)) {
        appendChildren(childId);
      }
    }
  };

  for (const rootId of rootIds) {
    out.push(rootId);
    if (expandedParentIds.has(rootId)) appendChildren(rootId);
  }

  return out;
}
