/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TIssue } from "@plane/types";

import type { IIssueSubIssuesStore } from "@/store/issue/issue-details/sub_issues.store";

/**
 * Orders sibling sub-work items for the Gantt rows: earliest `start_date` first; items
 * without a start date last. Ties use `sort_order`, then id (stable).
 *
 * Exported for unit tests.
 */
export function sortGanttSiblingIssueIds(
  issueIds: string[],
  getIssueById: (id: string) => TIssue | undefined
): string[] {
  return [...issueIds].toSorted((a: string, b: string) => {
    const ia = getIssueById(a);
    const ib = getIssueById(b);
    const sa = ia?.start_date?.trim() ?? "";
    const sb = ib?.start_date?.trim() ?? "";
    if (sa !== sb) {
      if (!sa) return 1;
      if (!sb) return -1;
      const byDate = sa.localeCompare(sb);
      if (byDate !== 0) return byDate;
    }
    const oa = ia?.sort_order ?? 0;
    const ob = ib?.sort_order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b);
  });
}

/**
 * DFS order for gantt rows: roots from the issues list first, then each expanded parent's
 * immediate children (sorted by schedule, see `sortGanttSiblingIssueIds`), recursively.
 *
 * @param rootIds Top-level work item ids only (no sub-work items whose parent is in the list);
 *                use `filterGanttRootIssueIds` on the flat view list when sub-work items may
 *                appear in `groupedIssueIds`.
 */
export function buildGanttOrderedBlockIds(
  rootIds: string[],
  expandedParentIds: ReadonlySet<string>,
  subIssuesStore: Pick<IIssueSubIssuesStore, "subIssuesByIssueId">,
  getIssueById: (id: string) => TIssue | undefined
): string[] {
  const out: string[] = [];

  const appendChildren = (parentId: string) => {
    const childIds = subIssuesStore.subIssuesByIssueId(parentId);
    if (!childIds?.length) return;
    const ordered = sortGanttSiblingIssueIds(childIds, getIssueById);
    for (const childId of ordered) {
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
