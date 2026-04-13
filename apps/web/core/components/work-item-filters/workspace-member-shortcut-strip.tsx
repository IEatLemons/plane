/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
import { EIssueFilterType, type TSupportedFilterTypeForUpdate } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Tooltip } from "@plane/propel/tooltip";
import type { IWorkItemFilterInstance } from "@plane/shared-state";
import { EIssueLayoutTypes, type TSupportedFilterForUpdate } from "@plane/types";
import { Avatar } from "@plane/ui";
import { cn, getFileURL } from "@plane/utils";
import { applyWorkspaceMemberAssigneeShortcut, isAssigneeShortcutActive } from "@/helpers/workspace-quick-filters";
import { useMember } from "@/hooks/store/use-member";

type Props = {
  filter: IWorkItemFilterInstance;
  workspaceSlug: string;
  globalViewId: string;
  activeLayout: EIssueLayoutTypes | undefined;
  updateFilters: (
    workspaceSlug: string,
    projectId: string | undefined,
    filterType: TSupportedFilterTypeForUpdate,
    filters: TSupportedFilterForUpdate,
    viewId: string
  ) => Promise<void>;
};

export const WorkspaceMemberShortcutStrip = observer(function WorkspaceMemberShortcutStrip(props: Props) {
  const { filter, workspaceSlug, globalViewId, activeLayout, updateFilters } = props;
  const { t } = useTranslation();
  const {
    workspace: { getWorkspaceMemberIds, getWorkspaceMemberDetails },
  } = useMember();

  const memberIds = getWorkspaceMemberIds(workspaceSlug);
  if (!memberIds?.length) return null;

  const handleMemberClick = (memberId: string) => {
    void (async () => {
      const wasActive = isAssigneeShortcutActive(filter, memberId);
      const next = applyWorkspaceMemberAssigneeShortcut(filter, memberId);
      filter.resetExpression(next, false);
      if (activeLayout === EIssueLayoutTypes.GANTT && !wasActive) {
        await updateFilters(
          workspaceSlug,
          undefined,
          EIssueFilterType.DISPLAY_FILTERS,
          { order_by: "start_date" },
          globalViewId
        );
      }
    })();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-subtle bg-surface-1 px-3 py-2">
      <span className="text-11 font-medium tracking-wide text-placeholder uppercase">
        {t("workspace_member_shortcuts.members_label")}
      </span>
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
        {memberIds.map((memberId) => {
          const member = getWorkspaceMemberDetails(memberId)?.member;
          if (!member) return null;
          const active = isAssigneeShortcutActive(filter, memberId);
          const label = t("workspace_member_shortcuts.member_filter_tooltip", {
            name: member.display_name,
          });
          return (
            <Tooltip key={memberId} tooltipContent={label}>
              <button
                type="button"
                aria-label={label}
                aria-pressed={active}
                className={cn(
                  "shrink-0 rounded-full p-0.5 ring-2 ring-transparent transition-colors",
                  active ? "ring-primary-200 bg-primary-50 dark:bg-primary-900/30" : "hover:bg-layer-1"
                )}
                onClick={() => handleMemberClick(memberId)}
              >
                <Avatar name={member.display_name} src={getFileURL(member.avatar_url)} showTooltip={false} size="sm" />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
});
