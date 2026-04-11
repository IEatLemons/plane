/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export type TWorkReportType = "daily" | "weekly";

export type TWorkReportAutoSummaryHighlight = {
  id: string;
  created_at: string | null;
  verb: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  issue_id: string | null;
  issue_name: string | null;
  project_id: string | null;
};

export type TWorkReportAutoSummary = {
  stats: {
    completed_issues: number;
    created_issues: number;
    activity_count: number;
  };
  highlights: TWorkReportAutoSummaryHighlight[];
  generated_at: string;
};

export type TWorkReport = {
  id: string;
  workspace: string;
  owner: string;
  report_type: TWorkReportType;
  period_start: string;
  period_end: string;
  notes: string;
  auto_summary: TWorkReportAutoSummary;
  auto_summary_generated_at: string | null;
  created_at: string;
  updated_at: string;
};
