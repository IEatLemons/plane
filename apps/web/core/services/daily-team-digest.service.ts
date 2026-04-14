/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { TDailyTeamDigest } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DailyTeamDigestService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async getDigest(workspaceSlug: string, periodDate: string): Promise<TDailyTeamDigest> {
    return this.get(`/api/workspaces/${workspaceSlug}/daily-team-digest/`, {
      params: { period_date: periodDate },
    })
      .then((res) => res?.data)
      .catch((error) => {
        throw error?.response?.data ?? error;
      });
  }
}
