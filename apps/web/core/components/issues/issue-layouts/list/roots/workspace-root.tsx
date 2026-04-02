/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { AllIssueQuickActions } from "@/components/issues/issue-layouts/quick-action-dropdowns";
import { useUserPermissions } from "@/hooks/store/user";
import { useWorkspaceIssueProperties } from "@/hooks/use-workspace-issue-properties";
import { BaseListRoot } from "../base-list-root";

type Props = {
  workspaceSlug: string;
};

export const WorkspaceListRoot = observer(function WorkspaceListRoot(props: Props) {
  const { workspaceSlug } = props;
  useWorkspaceIssueProperties(workspaceSlug);
  const { allowPermissions } = useUserPermissions();

  const canEditPropertiesBasedOnProject = (projectId: string) =>
    allowPermissions(
      [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
      EUserPermissionsLevel.PROJECT,
      workspaceSlug,
      projectId
    );

  return (
    <BaseListRoot
      QuickActions={AllIssueQuickActions}
      canEditPropertiesBasedOnProject={canEditPropertiesBasedOnProject}
    />
  );
});
