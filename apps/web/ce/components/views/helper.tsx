/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { EIssueLayoutTypes, type IProjectView } from "@plane/types";
import type { TWorkspaceLayoutProps } from "@/components/views/helper";
import { LayoutSelection, MobileLayoutSelection } from "@/components/issues/issue-layouts/filters";
import { WorkspaceCalendarRoot } from "@/components/issues/issue-layouts/calendar/roots/workspace-root";
import { WorkspaceGanttRoot } from "@/components/issues/issue-layouts/gantt/roots/workspace-root";
import { WorkspaceKanbanRoot } from "@/components/issues/issue-layouts/kanban/roots/workspace-root";
import { WorkspaceListRoot } from "@/components/issues/issue-layouts/list/roots/workspace-root";

const GLOBAL_VIEW_LAYOUTS: EIssueLayoutTypes[] = [
  EIssueLayoutTypes.LIST,
  EIssueLayoutTypes.KANBAN,
  EIssueLayoutTypes.CALENDAR,
  EIssueLayoutTypes.SPREADSHEET,
  EIssueLayoutTypes.GANTT,
];

export type TLayoutSelectionProps = {
  onChange: (layout: EIssueLayoutTypes) => void;
  selectedLayout: EIssueLayoutTypes;
  workspaceSlug: string;
};

export function GlobalViewLayoutSelection(props: TLayoutSelectionProps) {
  const { onChange, selectedLayout } = props;
  return (
    <>
      <div className="hidden @4xl:flex">
        <LayoutSelection layouts={GLOBAL_VIEW_LAYOUTS} onChange={onChange} selectedLayout={selectedLayout} />
      </div>
      <div className="flex @4xl:hidden">
        <MobileLayoutSelection layouts={GLOBAL_VIEW_LAYOUTS} onChange={onChange} activeLayout={selectedLayout} />
      </div>
    </>
  );
}

export function WorkspaceAdditionalLayouts(props: TWorkspaceLayoutProps) {
  const { activeLayout, workspaceSlug, globalViewId } = props;
  switch (activeLayout) {
    case EIssueLayoutTypes.LIST:
      return <WorkspaceListRoot workspaceSlug={workspaceSlug} />;
    case EIssueLayoutTypes.KANBAN:
      return <WorkspaceKanbanRoot workspaceSlug={workspaceSlug} />;
    case EIssueLayoutTypes.CALENDAR:
      return <WorkspaceCalendarRoot workspaceSlug={workspaceSlug} />;
    case EIssueLayoutTypes.GANTT:
      return <WorkspaceGanttRoot workspaceSlug={workspaceSlug} globalViewId={globalViewId} />;
    default:
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AdditionalHeaderItems(view: IProjectView) {
  return <></>;
}
