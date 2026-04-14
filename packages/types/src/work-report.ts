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

/** Single work item row in work report project buckets */
export type TWorkReportIssueRow = {
  id: string;
  sequence_id: number;
  name: string;
  project_id: string | null;
  state_id: string | null;
};

export type TWorkReportByProject = {
  project_id: string;
  project_name: string;
  completed: TWorkReportIssueRow[];
  in_progress: TWorkReportIssueRow[];
};

export type TWorkReportAutoSummary = {
  stats: {
    completed_issues: number;
    created_issues: number;
    activity_count: number;
  };
  /** Completed in the report period; in_progress is a snapshot at refresh time */
  by_project?: TWorkReportByProject[];
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

/** Workspace admin: all members' auto summaries for one calendar day */
export type TDailyTeamDigestUser = {
  user_id: string;
  display_name: string;
  auto_summary: TWorkReportAutoSummary;
};

export type TDailyTeamDigest = {
  period_start: string;
  period_end: string;
  users: TDailyTeamDigestUser[];
};
