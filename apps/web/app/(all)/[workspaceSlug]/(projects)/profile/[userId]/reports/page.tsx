/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "react-router";
import { EUserWorkspaceRoles } from "@plane/types";
import { useTranslation } from "@plane/i18n";
import type { TWorkReport, TWorkReportType } from "@plane/types";
import { Button } from "@plane/propel/button";
import { PageHead } from "@/components/core/page-title";
import { useUser } from "@/hooks/store/user";
import { useUserPermissions } from "@/hooks/store/user";
import { WorkReportService } from "@/services/work-report.service";

const workReportService = new WorkReportService();

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ProfileWorkReportsPage() {
  const { t } = useTranslation();
  const { workspaceSlug, userId } = useParams();
  const { data: currentUser } = useUser();
  const { getWorkspaceRoleByWorkspaceSlug } = useUserPermissions();

  const [reportType, setReportType] = useState<TWorkReportType>("daily");
  const [periodDate, setPeriodDate] = useState(() => toYmd(new Date()));
  const [report, setReport] = useState<TWorkReport | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ws = workspaceSlug?.toString() ?? "";
  const uid = userId?.toString() ?? "";

  const workspaceRole = ws ? getWorkspaceRoleByWorkspaceSlug(ws) : undefined;
  const canView = !!currentUser && (currentUser.id === uid || workspaceRole === EUserWorkspaceRoles.ADMIN);
  const canEdit = !!currentUser && currentUser.id === uid;

  const load = useCallback(
    async (refresh?: boolean) => {
      if (!ws || !uid || !canView) return;
      setLoading(true);
      setError(null);
      try {
        const data = await workReportService.getReport(ws, {
          type: reportType,
          period_date: periodDate,
          user_id: uid,
          refresh,
        });
        setReport(data);
        setNotesDraft(data.notes ?? "");
      } catch {
        setError(t("profile.work_report.load_error"));
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [ws, uid, canView, reportType, periodDate, t]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const summary = report?.auto_summary;
  const stats = summary?.stats;

  const periodLabel = useMemo(() => {
    if (!report) return "";
    return `${report.period_start} → ${report.period_end}`;
  }, [report]);

  const handleSaveNotes = async () => {
    if (!ws || !report || !canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await workReportService.patchNotes(ws, report.id, notesDraft);
      setReport(updated);
    } catch {
      setError(t("profile.work_report.load_error"));
    } finally {
      setSaving(false);
    }
  };

  if (!canView) {
    return (
      <div className="grid h-full w-full place-items-center px-5 text-secondary md:px-9">
        {t("you_do_not_have_the_permission_to_access_this_page")}
      </div>
    );
  }

  return (
    <>
      <PageHead title={`Profile — ${t("profile.work_report.title")}`} />
      <div className="vertical-scrollbar flex scrollbar-md h-full w-full flex-col gap-4 overflow-y-auto px-5 py-5 md:px-9">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h3 className="text-16 font-medium">{t("profile.work_report.title")}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-subtle bg-layer-2 p-0.5">
              <button
                type="button"
                className={`rounded px-2 py-1 text-12 font-medium ${reportType === "daily" ? "shadow-sm bg-layer-1 text-primary" : "text-tertiary"}`}
                onClick={() => setReportType("daily")}
              >
                {t("profile.work_report.type_daily")}
              </button>
              <button
                type="button"
                className={`rounded px-2 py-1 text-12 font-medium ${reportType === "weekly" ? "shadow-sm bg-layer-1 text-primary" : "text-tertiary"}`}
                onClick={() => setReportType("weekly")}
              >
                {t("profile.work_report.type_weekly")}
              </button>
            </div>
            <label className="flex items-center gap-2 text-13 text-secondary">
              <span>{t("profile.work_report.period_anchor")}</span>
              <input
                type="date"
                className="rounded-md border border-subtle bg-layer-2 px-2 py-1 text-13 text-primary outline-none"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
              />
            </label>
            <Button variant="secondary" disabled={loading} onClick={() => void load(true)}>
              {t("profile.work_report.refresh_summary")}
            </Button>
          </div>
        </div>

        {error && <div className="text-red-500 text-13">{error}</div>}

        {loading && !report ? (
          <div className="text-13 text-tertiary">…</div>
        ) : (
          <>
            <div className="text-12 text-tertiary">{periodLabel}</div>

            <section className="rounded-lg border border-subtle bg-layer-2 p-4">
              <h4 className="mb-3 text-13 font-semibold text-primary">{t("profile.work_report.auto_summary")}</h4>
              {stats && (
                <ul className="mb-4 grid gap-2 text-13 text-secondary sm:grid-cols-3">
                  <li>
                    {t("profile.work_report.stats_completed")}:{" "}
                    <span className="font-medium text-primary">{stats.completed_issues}</span>
                  </li>
                  <li>
                    {t("profile.work_report.stats_created")}:{" "}
                    <span className="font-medium text-primary">{stats.created_issues}</span>
                  </li>
                  <li>
                    {t("profile.work_report.stats_activity")}:{" "}
                    <span className="font-medium text-primary">{stats.activity_count}</span>
                  </li>
                </ul>
              )}
              <h5 className="mb-2 text-12 font-medium text-tertiary">{t("profile.work_report.highlights")}</h5>
              <ul className="vertical-scrollbar scrollbar-sm max-h-60 space-y-2 overflow-y-auto text-12 text-secondary">
                {(summary?.highlights ?? []).map((h) => (
                  <li key={h.id} className="border-b border-subtle/60 pb-2 last:border-0">
                    <span className="text-primary">{h.issue_name ?? h.verb}</span>
                    {h.field ? (
                      <span className="text-tertiary">
                        {" "}
                        · {h.field}: {h.new_value ?? h.old_value ?? ""}
                      </span>
                    ) : null}
                  </li>
                ))}
                {(summary?.highlights?.length ?? 0) === 0 ? <li className="text-tertiary">—</li> : null}
              </ul>
            </section>

            <section className="flex flex-col gap-2">
              <label className="text-13 font-medium text-primary" htmlFor="work-report-notes">
                {t("profile.work_report.notes_label")}
              </label>
              {!canEdit && <p className="text-12 text-tertiary">{t("profile.work_report.admin_readonly")}</p>}
              <textarea
                id="work-report-notes"
                className="min-h-28 rounded-lg border border-subtle bg-layer-2 px-3 py-2 text-13 text-primary outline-none focus:border-accent-strong"
                placeholder={t("profile.work_report.notes_placeholder")}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                disabled={!canEdit}
              />
              {canEdit && (
                <div>
                  <Button variant="primary" disabled={saving || loading} onClick={() => void handleSaveNotes()}>
                    {t("profile.work_report.save_notes")}
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default observer(ProfileWorkReportsPage);
