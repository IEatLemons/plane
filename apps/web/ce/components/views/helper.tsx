/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { EIssueLayoutTypes, type IProjectView } from "@plane/types";
import type { TWorkspaceLayoutProps } from "@/components/views/helper";
import { WorkspaceCalendarRoot } from "@/components/issues/issue-layouts/calendar/roots/workspace-root";
import { WorkspaceGanttRoot } from "@/components/issues/issue-layouts/gantt/roots/workspace-root";
import { WorkspaceKanbanRoot } from "@/components/issues/issue-layouts/kanban/roots/workspace-root";
import { WorkspaceListRoot } from "@/components/issues/issue-layouts/list/roots/workspace-root";

export type TLayoutSelectionProps = {
  onChange: (layout: EIssueLayoutTypes) => void;
  selectedLayout: EIssueLayoutTypes;
  workspaceSlug: string;
};

export function GlobalViewLayoutSelection(_props: TLayoutSelectionProps) {
  return <></>;
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
