/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
// hooks
import { useProfileIssuesViewId } from "@/hooks/use-profile-issues-view-id";

// TODO: If projectViewId changes, everything breaks. Figure out a better way to handle this.
export const ProfileViewEmptyState = observer(function ProfileViewEmptyState() {
  // plane hooks
  const { t } = useTranslation();
  const viewKey = useProfileIssuesViewId();

  return (
    <EmptyStateDetailed
      assetKey="work-item"
      title={t(`profile.empty_state.${viewKey}.title`)}
      description={t(`profile.empty_state.${viewKey}.description`)}
    />
  );
});
