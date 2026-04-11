/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TWorkReport, TWorkReportType } from "@plane/types";
import { APIService } from "@/services/api.service";

export type TWorkReportQuery = {
  type: TWorkReportType;
  /** Anchor calendar date (YYYY-MM-DD) in the report owner's timezone semantics (server-side). */
  period_date: string;
  user_id?: string;
  refresh?: boolean;
};

export class WorkReportService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getReport(workspaceSlug: string, query: TWorkReportQuery): Promise<TWorkReport> {
    return this.get(`/api/workspaces/${workspaceSlug}/work-reports/`, {
      params: {
        type: query.type,
        period_date: query.period_date,
        ...(query.user_id ? { user_id: query.user_id } : {}),
        ...(query.refresh ? { refresh: "true" } : {}),
      },
    })
      .then((res) => res?.data)
      .catch((error) => {
        throw error?.response?.data ?? error;
      });
  }

  async patchNotes(workspaceSlug: string, reportId: string, notes: string): Promise<TWorkReport> {
    return this.patch(`/api/workspaces/${workspaceSlug}/work-reports/${reportId}/`, { notes })
      .then((res) => res?.data)
      .catch((error) => {
        throw error?.response?.data ?? error;
      });
  }
}
