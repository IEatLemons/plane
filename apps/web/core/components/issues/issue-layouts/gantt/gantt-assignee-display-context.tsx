/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const GanttAssigneeTailContext = createContext(false);

export function GanttAssigneeTailProvider(props: { showAssigneeTail: boolean; children: ReactNode }) {
  const { showAssigneeTail, children } = props;
  return <GanttAssigneeTailContext.Provider value={showAssigneeTail}>{children}</GanttAssigneeTailContext.Provider>;
}

export function useGanttAssigneeTailDisplay(): boolean {
  return useContext(GanttAssigneeTailContext);
}
