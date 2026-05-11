/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { IDefect } from "@plane/types";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { tryCreateDefectForTask } from "@/helpers/try-create-defect-for-task";
import { DefectService } from "@/services/defect.service";
import { cn } from "@plane/utils";

const defectService = new DefectService();

type Props = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  projectIdentifier: string | undefined;
  isEditable: boolean;
};

export function TaskDefectsPanel(props: Props) {
  const { workspaceSlug, projectId, issueId, projectIdentifier, isEditable } = props;
  const { t } = useTranslation();
  const [defects, setDefects] = useState<IDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await defectService.list(workspaceSlug, projectId, { task_id: issueId });
      setDefects(rows);
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: t("toast.error"), message: t("defect_panel.load_error") });
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, projectId, issueId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setSubmitting(true);
    const result = await tryCreateDefectForTask({
      name,
      taskId: issueId,
      create: (payload) => defectService.create(workspaceSlug, projectId, payload),
    });
    setSubmitting(false);
    if (result.ok) {
      setName("");
      await load();
      setToast({ type: TOAST_TYPE.SUCCESS, title: t("toast.success"), message: t("defect_panel.created") });
      return;
    }
    if (result.reason === "empty_name") return;
    setToast({ type: TOAST_TYPE.ERROR, title: t("toast.error"), message: t("defect_panel.create_error") });
  };

  return (
    <div className="mt-4 border-t border-subtle pt-4">
      <h5 className="text-body-xs-medium text-primary">{t("defect_panel.title")}</h5>
      <p className="mt-1 text-11 text-secondary">{t("defect_panel.hint")}</p>
      {isEditable && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            className="focus:border-primary grow rounded-md border border-subtle bg-surface-1 px-2 py-1.5 text-body-sm-regular outline-none placeholder:text-placeholder"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("defect_panel.name_placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <Button variant="primary" onClick={() => void handleCreate()} disabled={submitting || !name.trim()}>
            {t("defect_panel.add")}
          </Button>
        </div>
      )}
      <ul className={cn("mt-3 space-y-1.5", loading && "opacity-60")}>
        {defects.map((d) => (
          <li key={d.id}>
            <Link
              href={`/${workspaceSlug}/projects/${projectId}/defects/${d.id}`}
              className="text-body-xs-regular text-primary hover:underline"
            >
              {projectIdentifier ? `${projectIdentifier}-${d.sequence_id}` : d.sequence_id}: {d.name}
            </Link>
          </li>
        ))}
        {!loading && defects.length === 0 && <li className="text-11 text-placeholder">{t("defect_panel.empty")}</li>}
      </ul>
    </div>
  );
}
