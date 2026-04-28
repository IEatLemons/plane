/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useProfileIssuesViewId } from "@/hooks/use-profile-issues-view-id";
import { BaseGanttRoot } from "../base-gantt-root";

export const ProfileIssuesGanttLayout = observer(function ProfileIssuesGanttLayout() {
  const viewId = useProfileIssuesViewId();
  return <BaseGanttRoot viewId={viewId} />;
});
