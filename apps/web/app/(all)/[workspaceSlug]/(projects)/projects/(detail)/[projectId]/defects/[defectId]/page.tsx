/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { IDefect } from "@plane/types";
import { useTranslation } from "@plane/i18n";
import { LogoSpinner } from "@/components/common/logo-spinner";
import { PageHead } from "@/components/core/page-title";
import { DefectService } from "@/services/defect.service";

const defectService = new DefectService();

type Props = {
  params: { workspaceSlug: string; projectId: string; defectId: string };
};

export default function ProjectDefectDetailPage({ params }: Props) {
  const { workspaceSlug, projectId, defectId } = params;
  const { t } = useTranslation();
  const [defect, setDefect] = useState<IDefect | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await defectService.getDefect(workspaceSlug, projectId, defectId);
        if (!cancelled) setDefect(d);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, projectId, defectId]);

  const taskBrowseHref =
    defect?.project_identifier && defect.task_sequence_id != null
      ? `/${workspaceSlug}/browse/${defect.project_identifier}-${defect.task_sequence_id}`
      : defect?.task_id
        ? `/${workspaceSlug}/projects/${projectId}/issues/${defect.task_id}`
        : "#";

  return (
    <>
      <PageHead
        title={defect ? `${defect.project_identifier ?? ""}-${defect.sequence_id}: ${defect.name}` : "Defect"}
      />
      <div className="h-full w-full overflow-y-auto p-6">
        {!defect && !failed ? (
          <div className="flex h-48 items-center justify-center">
            <LogoSpinner />
          </div>
        ) : failed || !defect ? (
          <p className="text-13 text-secondary">{t("defect_detail.not_found")}</p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="text-11 text-secondary">
              <Link href={`/${workspaceSlug}/bug-pool`} className="text-primary hover:underline">
                {t("bug_pool.title")}
              </Link>
              <span className="px-1">/</span>
              <span>
                {defect.project_identifier}-{defect.sequence_id}
              </span>
            </div>
            <h1 className="text-20 font-semibold text-primary">{defect.name}</h1>
            <p className="text-13 text-secondary">
              {t("defect_detail.linked_task")}:{" "}
              <Link href={taskBrowseHref} className="text-primary hover:underline">
                {defect.task_name ?? defect.task_id}
                {defect.task_sequence_id != null ? ` (${defect.project_identifier}-${defect.task_sequence_id})` : ""}
              </Link>
            </p>
            <div
              className="prose-sm max-w-none text-primary prose"
              dangerouslySetInnerHTML={{ __html: defect.description_html || "" }}
            />
          </div>
        )}
      </div>
    </>
  );
}
