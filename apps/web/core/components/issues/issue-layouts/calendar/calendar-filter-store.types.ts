/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { ICycleIssuesFilter } from "@/store/issue/cycle";
import type { IModuleIssuesFilter } from "@/store/issue/module";
import type { IProjectIssuesFilter } from "@/store/issue/project";
import type { IProjectViewIssuesFilter } from "@/store/issue/project-views";
import type { IProfileIssuesFilter } from "@/store/issue/profile/filter.store";
import type { IWorkspaceIssuesFilter } from "@/store/issue/workspace/filter.store";

export type TCalendarIssuesFilterStore =
  | IProjectIssuesFilter
  | IModuleIssuesFilter
  | ICycleIssuesFilter
  | IProjectViewIssuesFilter
  | IWorkspaceIssuesFilter
  | IProfileIssuesFilter;
