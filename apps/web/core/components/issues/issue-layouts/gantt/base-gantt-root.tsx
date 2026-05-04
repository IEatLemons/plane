/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { ALL_ISSUES, EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IBlockUpdateData, TIssue } from "@plane/types";
import { EIssueServiceType, EIssuesStoreType, EIssueLayoutTypes, GANTT_TIMELINE_TYPE } from "@plane/types";
import { renderFormattedPayloadDate } from "@plane/utils";
// components
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { GanttChartRoot } from "@/components/gantt-chart/root";
import { IssueGanttSidebar } from "@/components/gantt-chart/sidebar/issues/sidebar";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useUserPermissions } from "@/hooks/store/user";
import { useIssueStoreType } from "@/hooks/use-issue-layout-store";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import { useTimeLineChart } from "@/hooks/use-timeline-chart";
import { computeShowGanttAssigneeTail } from "@/helpers/gantt-assignee-tail";
// plane web hooks
import { useBulkOperationStatus } from "@/plane-web/hooks/use-bulk-operation-status";

import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { IssueLayoutHOC } from "../issue-layout-HOC";
import { GanttQuickAddIssueButton, QuickAddIssueRoot } from "../quick-add";
import { buildGanttOrderedBlockIds } from "./build-gantt-block-ids";
import { filterGanttRootIssueIds } from "./filter-gantt-root-issue-ids";
import { IssueGanttBlock } from "./blocks";
import { GanttAssigneeTailProvider } from "./gantt-assignee-display-context";
import { GanttSubExpandContext } from "./gantt-sub-expand-context";

interface IBaseGanttRoot {
  viewId?: string | undefined;
  isCompletedCycle?: boolean;
  isEpic?: boolean;
}

export type GanttStoreType =
  | EIssuesStoreType.PROJECT
  | EIssuesStoreType.MODULE
  | EIssuesStoreType.CYCLE
  | EIssuesStoreType.PROJECT_VIEW
  | EIssuesStoreType.EPIC
  | EIssuesStoreType.GLOBAL
  | EIssuesStoreType.PROFILE;

export const BaseGanttRoot = observer(function BaseGanttRoot(ganttRootProps: IBaseGanttRoot) {
  const { viewId, isCompletedCycle = false, isEpic = false } = ganttRootProps;
  const { t } = useTranslation();
  // router
  const { workspaceSlug, projectId } = useParams();

  const storeType = useIssueStoreType() as GanttStoreType;
  const { issues, issuesFilter, issueMap } = useIssues(storeType);
  const { fetchIssues, fetchNextIssues, updateIssue, quickAddIssue } = useIssuesActions(storeType);
  const { initGantt } = useTimeLineChart(GANTT_TIMELINE_TYPE.ISSUE);
  const { subIssues: subIssuesStore } = useIssueDetail(isEpic ? EIssueServiceType.EPICS : EIssueServiceType.ISSUES);
  // store hooks
  const { allowPermissions } = useUserPermissions();

  const appliedDisplayFilters = issuesFilter.issueFilters?.displayFilters;
  // plane web hooks
  const isBulkOperationsEnabled = useBulkOperationStatus();
  // derived values
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 1);

  useEffect(() => {
    fetchIssues("init-loader", { canGroup: false, perPageCount: 100 }, viewId);
  }, [fetchIssues, storeType, viewId]);

  useEffect(() => {
    initGantt();
  }, [initGantt]);

  const issuesIds = useMemo(() => (issues.groupedIssueIds?.[ALL_ISSUES] as string[]) ?? [], [issues.groupedIssueIds]);

  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(() => new Set());

  const ganttRootIds = useMemo(() => filterGanttRootIssueIds(issuesIds, (id) => issueMap[id]), [issuesIds, issueMap]);

  const ganttBlockIds = buildGanttOrderedBlockIds(
    ganttRootIds,
    expandedParentIds,
    subIssuesStore,
    (id) => issueMap[id]
  );

  const toggleSubExpand = useCallback(
    async (issueId: string) => {
      const issue = issueMap[issueId];
      const ws = workspaceSlug?.toString();
      if (!issue?.project_id || !ws) return;

      if (expandedParentIds.has(issueId)) {
        setExpandedParentIds((prev) => {
          const next = new Set(prev);
          next.delete(issueId);
          return next;
        });
        return;
      }

      await subIssuesStore.fetchSubIssues(ws, issue.project_id, issueId);
      setExpandedParentIds((prev) => new Set(prev).add(issueId));
    },
    [expandedParentIds, issueMap, subIssuesStore, workspaceSlug]
  );

  const subExpandContextValue = useMemo(
    () => ({
      isExpanded: (issueId: string) => expandedParentIds.has(issueId),
      toggleExpand: toggleSubExpand,
    }),
    [expandedParentIds, toggleSubExpand]
  );

  const showAssigneeTail = computeShowGanttAssigneeTail(ganttBlockIds, (id) => issueMap[id]);
  const nextPageResults = issues.getPaginationData(undefined, undefined)?.nextPageResults;

  const { enableIssueCreation } = issues?.viewFlags || {};

  const loadMoreIssues = useCallback(() => {
    fetchNextIssues();
  }, [fetchNextIssues]);

  const updateIssueBlockStructure = async (issue: TIssue, data: IBlockUpdateData) => {
    if (!workspaceSlug) return;

    const payload: any = { ...data };
    if (data.sort_order) payload.sort_order = data.sort_order.newSortOrder;

    if (updateIssue) await updateIssue(issue.project_id, issue.id, payload);
  };

  const isAllowedWorkspace = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE,
    workspaceSlug?.toString()
  );
  const isAllowedProject = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );
  const isAllowed =
    storeType === EIssuesStoreType.GLOBAL || storeType === EIssuesStoreType.PROFILE
      ? isAllowedWorkspace
      : isAllowedProject;

  const updateBlockDates = useCallback(
    async (updates: { id: string; start_date?: string; target_date?: string }[]): Promise<void> => {
      if (!workspaceSlug?.toString()) return;

      const onDatesError = () => {
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("toast.error"),
          message: "Error while updating work item dates, Please try again Later",
        });
      };

      if (storeType === EIssuesStoreType.GLOBAL || storeType === EIssuesStoreType.PROFILE) {
        const byProject = new Map<string, { id: string; start_date?: string; target_date?: string }[]>();
        for (const u of updates) {
          const issue = issueMap[u.id];
          const pid = issue?.project_id;
          if (!pid) continue;
          const batch = byProject.get(pid) ?? [];
          batch.push(u);
          byProject.set(pid, batch);
        }
        await Promise.all(
          [...byProject.entries()].map(([pid, batch]) =>
            issues.updateIssueDates(workspaceSlug.toString(), batch, pid).catch(onDatesError)
          )
        );
        return;
      }

      const routeProjectId = projectId?.toString();
      if (!routeProjectId) return;
      await issues.updateIssueDates(workspaceSlug.toString(), updates, routeProjectId).catch(onDatesError);
    },
    [issues, projectId, workspaceSlug, storeType, issueMap, t]
  );

  const disableGanttQuickAdd = storeType === EIssuesStoreType.GLOBAL || storeType === EIssuesStoreType.PROFILE;
  const quickAdd =
    !disableGanttQuickAdd && enableIssueCreation && isAllowed && !isCompletedCycle ? (
      <QuickAddIssueRoot
        layout={EIssueLayoutTypes.GANTT}
        QuickAddButton={GanttQuickAddIssueButton}
        containerClassName="sticky bottom-0 z-[1]"
        prePopulatedData={{
          start_date: renderFormattedPayloadDate(new Date()),
          target_date: renderFormattedPayloadDate(targetDate),
        }}
        quickAddCallback={quickAddIssue}
        isEpic={isEpic}
      />
    ) : undefined;

  return (
    <IssueLayoutHOC layout={EIssueLayoutTypes.GANTT}>
      <TimeLineTypeContext.Provider value={GANTT_TIMELINE_TYPE.ISSUE}>
        <GanttAssigneeTailProvider showAssigneeTail={showAssigneeTail}>
          <GanttSubExpandContext.Provider value={subExpandContextValue}>
            <div className="h-full w-full">
              <GanttChartRoot
                border={false}
                title={isEpic ? t("epic.label", { count: 2 }) : t("issue.label", { count: 2 })}
                loaderTitle={isEpic ? t("epic.label", { count: 2 }) : t("issue.label", { count: 2 })}
                blockIds={ganttBlockIds}
                blockUpdateHandler={updateIssueBlockStructure}
                blockToRender={(data: TIssue) => <IssueGanttBlock issueId={data.id} isEpic={isEpic} />}
                sidebarToRender={(sidebarProps) => (
                  <IssueGanttSidebar {...sidebarProps} showAllBlocks isEpic={isEpic} />
                )}
                enableBlockLeftResize={isAllowed}
                enableBlockRightResize={isAllowed}
                enableBlockMove={isAllowed}
                enableReorder={appliedDisplayFilters?.order_by === "sort_order" && isAllowed}
                enableAddBlock={isAllowed}
                enableSelection={isBulkOperationsEnabled && isAllowed}
                bottomSpacing={Boolean(quickAdd)}
                quickAdd={quickAdd}
                loadMoreBlocks={loadMoreIssues}
                canLoadMoreBlocks={nextPageResults}
                updateBlockDates={updateBlockDates}
                showAllBlocks
                enableDependency
                isEpic={isEpic}
              />
            </div>
          </GanttSubExpandContext.Provider>
        </GanttAssigneeTailProvider>
      </TimeLineTypeContext.Provider>
    </IssueLayoutHOC>
  );
});
