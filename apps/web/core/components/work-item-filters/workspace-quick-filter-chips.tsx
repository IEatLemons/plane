/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
// plane imports
import type { IWorkItemFilterInstance } from "@plane/shared-state";
import { EIssueFilterType, type TSupportedFilterTypeForUpdate } from "@plane/constants";
import type { TSupportedFilterForUpdate } from "@plane/types";
import { Button } from "@plane/propel/button";
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// helpers
import {
  applyWorkspaceQuickFilterPreset,
  isAssignedToMeFilterActive,
  isDueNext7DaysFilterActive,
  isDueTodayFilterActive,
  type TWorkspaceQuickFilterPreset,
} from "@/helpers/workspace-quick-filters";

type Props = {
  filter: IWorkItemFilterInstance;
  currentUserId: string | undefined;
  workspaceSlug: string;
  globalViewId: string;
  updateFilters: (
    workspaceSlug: string,
    projectId: string | undefined,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    viewId: string
  ) => Promise<void>;
};

export const WorkspaceQuickFilterChips = observer(function WorkspaceQuickFilterChips(props: Props) {
  const { filter, currentUserId, workspaceSlug, globalViewId, updateFilters } = props;
  const { t } = useTranslation();

  const applyPreset = async (preset: TWorkspaceQuickFilterPreset) => {
    const beforeToday = isDueTodayFilterActive(filter);
    const beforeNext7 = isDueNext7DaysFilterActive(filter);
    const next = applyWorkspaceQuickFilterPreset(filter, preset, currentUserId);
    filter.resetExpression(next, false);

    if (preset === "due_today") {
      const afterToday = isDueTodayFilterActive(filter);
      if (afterToday && !beforeToday) {
        await updateFilters(
          workspaceSlug,
          undefined,
          EIssueFilterType.DISPLAY_FILTERS,
          { order_by: "target_date" },
          globalViewId
        );
      }
    }

    if (preset === "due_next_7_days") {
      const afterNext7 = isDueNext7DaysFilterActive(filter);
      if (afterNext7 && !beforeNext7) {
        await updateFilters(
          workspaceSlug,
          undefined,
          EIssueFilterType.DISPLAY_FILTERS,
          { order_by: "target_date" },
          globalViewId
        );
      }
    }
  };

  const todayActive = isDueTodayFilterActive(filter);
  const next7Active = isDueNext7DaysFilterActive(filter);
  const assignedActive = isAssignedToMeFilterActive(filter, currentUserId);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-subtle bg-surface-1 px-3 py-2">
      <span className="text-11 font-medium tracking-wide text-placeholder uppercase">
        {t("workspace_quick_filters.label")}
      </span>
      <Button
        type="button"
        variant={todayActive ? "primary" : "secondary"}
        size="sm"
        className={cn("h-7 text-12", !todayActive && "font-normal")}
        onClick={() => void applyPreset("due_today")}
      >
        {t("workspace_quick_filters.due_today")}
      </Button>
      <Button
        type="button"
        variant={next7Active ? "primary" : "secondary"}
        size="sm"
        className={cn("h-7 text-12", !next7Active && "font-normal")}
        onClick={() => void applyPreset("due_next_7_days")}
      >
        {t("workspace_quick_filters.due_next_7_days")}
      </Button>
      <Button
        type="button"
        variant={assignedActive ? "primary" : "secondary"}
        size="sm"
        className={cn("h-7 text-12", !assignedActive && "font-normal")}
        onClick={() => void applyPreset("assigned_to_me")}
        disabled={!currentUserId}
      >
        {t("workspace_quick_filters.assigned_to_me")}
      </Button>
    </div>
  );
});
