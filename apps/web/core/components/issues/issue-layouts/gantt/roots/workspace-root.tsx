/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useWorkspaceIssueProperties } from "@/hooks/use-workspace-issue-properties";
import { BaseGanttRoot } from "../base-gantt-root";

type Props = {
  workspaceSlug: string;
  globalViewId: string;
};

export const WorkspaceGanttRoot = observer(function WorkspaceGanttRoot(props: Props) {
  const { workspaceSlug, globalViewId } = props;
  useWorkspaceIssueProperties(workspaceSlug);
  return <BaseGanttRoot viewId={globalViewId} />;
});
