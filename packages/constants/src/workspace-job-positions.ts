/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { TWorkspaceJobPosition } from "@plane/types";

/** Normalized workspace member job position keys (stored on `WorkspaceMember.job_positions`). */
export const WORKSPACE_JOB_POSITIONS: readonly TWorkspaceJobPosition[] = [
  "project_manager",
  "product_manager",
  "developer",
  "ui_designer",
  "qa",
  "operations",
] as const;

export const WORKSPACE_JOB_POSITION_KEYS: readonly string[] = WORKSPACE_JOB_POSITIONS;
