/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TProfileViews } from "@plane/types";

function paramToString(p: string | string[] | undefined): string | undefined {
  if (p === undefined) return undefined;
  return Array.isArray(p) ? p[0] : p;
}

/**
 * Resolves the profile work-items "view" when the route may lack `profileViewId` (e.g. embedded on Summary).
 * URL param wins when present; otherwise use the store's currentView (set by ProfileIssuesPage).
 */
export function resolveProfileIssuesViewId(
  profileViewId: string | string[] | undefined,
  currentView: TProfileViews
): TProfileViews {
  const fromUrl = paramToString(profileViewId);
  if (fromUrl) return fromUrl as TProfileViews;
  return currentView;
}
