/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { createContext, useContext } from "react";

export type GanttSubExpandContextValue = {
  isExpanded: (issueId: string) => boolean;
  toggleExpand: (issueId: string) => void | Promise<void>;
};

export const GanttSubExpandContext = createContext<GanttSubExpandContextValue | null>(null);

export function useGanttSubExpand(): GanttSubExpandContextValue | null {
  return useContext(GanttSubExpandContext);
}
