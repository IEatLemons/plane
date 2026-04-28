/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useParams } from "next/navigation";
// plane
import { EIssuesStoreType } from "@plane/types";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
// local
import { resolveProfileIssuesViewId } from "./resolve-profile-issues-view-id";

/**
 * @returns Effective profile view id for list/kanban/calendar/gantt fetches and empty states.
 */
export function useProfileIssuesViewId() {
  const { profileViewId } = useParams();
  const { issues } = useIssues(EIssuesStoreType.PROFILE);
  return resolveProfileIssuesViewId(profileViewId, issues.currentView);
}
