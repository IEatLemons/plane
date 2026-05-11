/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { tryCreateDefectForTask } from "@/helpers/try-create-defect-for-task";
import { DefectService } from "@/services/defect.service";

const defectService = new DefectService();

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  /** Called after successful create (e.g. navigate or refresh) */
  onCreated?: () => void;
};

export function QuickCreateDefectModal(props: Props) {
  const { isOpen, onClose, workspaceSlug, projectId, issueId, onCreated } = props;
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await tryCreateDefectForTask({
      name,
      taskId: issueId,
      create: (payload) => defectService.create(workspaceSlug, projectId, payload),
    });
    setSubmitting(false);
    if (result.ok) {
      setToast({ type: TOAST_TYPE.SUCCESS, title: t("toast.success"), message: t("defect_panel.created") });
      handleClose();
      onCreated?.();
      return;
    }
    if (result.reason === "empty_name") return;
    setToast({ type: TOAST_TYPE.ERROR, title: t("toast.error"), message: t("defect_panel.create_error") });
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.MD}>
      <div className="p-5">
        <h3 className="text-h4-medium text-primary">{t("defect_quick_create.title")}</h3>
        <p className="mt-2 text-13 text-secondary">{t("defect_quick_create.description")}</p>
        <input
          type="text"
          className="focus:border-primary mt-4 w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-body-sm-regular outline-none placeholder:text-placeholder"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("defect_panel.name_placeholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSubmit();
          }}
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void handleSubmit()} loading={submitting} disabled={!name.trim()}>
            {t("defect_quick_create.submit")}
          </Button>
        </div>
      </div>
    </ModalCore>
  );
}
