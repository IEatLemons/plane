/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
import type { TWorkReportByProject } from "@plane/types";
import { useTranslation } from "@plane/i18n";

type Props = {
  workspaceSlug: string;
  byProject: TWorkReportByProject[];
};

function IssueLine({
  workspaceSlug,
  projectId,
  issue,
}: {
  workspaceSlug: string;
  projectId: string | null;
  issue: { id: string; sequence_id: number; name: string };
}) {
  const label = `#${issue.sequence_id}`;
  if (projectId) {
    return (
      <li className="truncate text-12 text-secondary">
        <Link
          href={`/${workspaceSlug}/projects/${projectId}/issues/${issue.id}`}
          className="font-medium text-primary hover:underline"
        >
          {label}
        </Link>
        <span className="text-secondary"> {issue.name}</span>
      </li>
    );
  }
  return (
    <li className="truncate text-12 text-secondary">
      <span className="font-medium text-primary">{label}</span>
      <span> {issue.name}</span>
    </li>
  );
}

export function WorkReportByProjectLists(props: Props) {
  const { workspaceSlug, byProject } = props;
  const { t } = useTranslation();

  if (!byProject.length) {
    return <p className="text-12 text-tertiary">—</p>;
  }

  return (
    <div className="space-y-4">
      {byProject.map((p) => (
        <div key={p.project_id} className="rounded-md border border-subtle/80 bg-layer-2/50 p-3">
          <h5 className="mb-2 text-12 font-semibold text-primary">{p.project_name || p.project_id}</h5>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-11 font-medium tracking-wide text-tertiary uppercase">
                {t("profile.work_report.completed_in_period")}
              </p>
              <ul className="space-y-1">
                {p.completed.length === 0 ? (
                  <li className="text-12 text-tertiary">—</li>
                ) : (
                  p.completed.map((issue) => (
                    <IssueLine
                      key={issue.id}
                      workspaceSlug={workspaceSlug}
                      projectId={issue.project_id ?? p.project_id}
                      issue={issue}
                    />
                  ))
                )}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-11 font-medium tracking-wide text-tertiary uppercase">
                {t("profile.work_report.in_progress_now")}
              </p>
              <ul className="space-y-1">
                {p.in_progress.length === 0 ? (
                  <li className="text-12 text-tertiary">—</li>
                ) : (
                  p.in_progress.map((issue) => (
                    <IssueLine
                      key={issue.id}
                      workspaceSlug={workspaceSlug}
                      projectId={issue.project_id ?? p.project_id}
                      issue={issue}
                    />
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
