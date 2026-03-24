/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { Navigate, useParams } from "react-router";

/**
 * Billing & plans is hidden in this fork; keep the route so old links redirect to workspace settings.
 */
export default function BillingSettingsRedirectPage() {
  const { workspaceSlug } = useParams();
  if (!workspaceSlug) return null;
  return <Navigate to={`/${workspaceSlug}/settings/`} replace />;
}
