/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { useTranslation } from "@plane/i18n";
import { EUserWorkspaceRoles, type TDailyTeamDigest } from "@plane/types";
import { Button } from "@plane/propel/button";
import { PageHead } from "@/components/core/page-title";
import { WorkReportByProjectLists } from "@/components/work-report/by-project-lists";
import { useUserPermissions } from "@/hooks/store/user";
import { DailyTeamDigestService } from "@/services/daily-team-digest.service";

const dailyTeamDigestService = new DailyTeamDigestService();

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function TeamDailyReportPage() {
  const { t } = useTranslation();
  const { workspaceSlug } = useParams();
  const { getWorkspaceRoleByWorkspaceSlug } = useUserPermissions();

  const ws = workspaceSlug?.toString() ?? "";
  const workspaceRole = ws ? getWorkspaceRoleByWorkspaceSlug(ws) : undefined;
  const isAdmin = workspaceRole === EUserWorkspaceRoles.ADMIN;

  const [periodDate, setPeriodDate] = useState(() => toYmd(new Date()));
  const [digest, setDigest] = useState<TDailyTeamDigest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ws || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dailyTeamDigestService.getDigest(ws, periodDate);
      setDigest(data);
    } catch {
      setError(t("profile.work_report.team_daily_load_error"));
      setDigest(null);
    } finally {
      setLoading(false);
    }
  }, [ws, isAdmin, periodDate, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin) {
    return (
      <div className="grid h-full w-full place-items-center px-5 text-secondary md:px-9">
        {t("you_do_not_have_the_permission_to_access_this_page")}
      </div>
    );
  }

  return (
    <>
      <PageHead title={t("profile.work_report.team_daily_title")} />
      <div className="vertical-scrollbar flex scrollbar-md h-full w-full flex-col gap-4 overflow-y-auto px-5 py-5 md:px-9">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h3 className="text-16 font-medium">{t("profile.work_report.team_daily_title")}</h3>
            <p className="mt-1 text-13 text-tertiary">{t("profile.work_report.team_daily_description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-13 text-secondary">
              <span>{t("profile.work_report.period_anchor")}</span>
              <input
                type="date"
                className="rounded-md border border-subtle bg-layer-2 px-2 py-1 text-13 text-primary outline-none"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
              />
            </label>
            <Button variant="secondary" disabled={loading} onClick={() => void load()}>
              {t("profile.work_report.refresh_summary")}
            </Button>
          </div>
        </div>

        {error && <div className="text-red-500 text-13">{error}</div>}

        {loading && !digest ? (
          <div className="text-13 text-tertiary">…</div>
        ) : (
          <div className="flex flex-col gap-6">
            {(digest?.users ?? []).map((u) => (
              <section key={u.user_id} className="rounded-lg border border-subtle bg-layer-2 p-4">
                <h4 className="mb-3 text-13 font-semibold text-primary">{u.display_name}</h4>
                {u.auto_summary?.stats && (
                  <ul className="mb-4 grid gap-2 text-13 text-secondary sm:grid-cols-3">
                    <li>
                      {t("profile.work_report.stats_completed")}:{" "}
                      <span className="font-medium text-primary">{u.auto_summary.stats.completed_issues}</span>
                    </li>
                    <li>
                      {t("profile.work_report.stats_created")}:{" "}
                      <span className="font-medium text-primary">{u.auto_summary.stats.created_issues}</span>
                    </li>
                    <li>
                      {t("profile.work_report.stats_activity")}:{" "}
                      <span className="font-medium text-primary">{u.auto_summary.stats.activity_count}</span>
                    </li>
                  </ul>
                )}
                <h5 className="mb-2 text-12 font-medium text-tertiary">{t("profile.work_report.by_project_title")}</h5>
                <WorkReportByProjectLists workspaceSlug={ws} byProject={u.auto_summary?.by_project ?? []} />
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default observer(TeamDailyReportPage);
