/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { ISearchIssueResponse } from "@plane/types";
import { CustomSelect, EModalPosition, EModalWidth, ModalCore } from "@plane/ui";
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
import { tryCreateDefectForTask } from "@/helpers/try-create-defect-for-task";
import { DefectService } from "@/services/defect.service";
import { PickParentIssueModal } from "./pick-parent-issue-modal";

const defectService = new DefectService();

const ALL_PROJECTS = "__all_projects__";

type ProjectOption = { id: string; name: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  workspaceSlug: string;
  /** When set, project is fixed (project bug pool) */
  scopedProjectId?: string;
  workspaceProjects: ProjectOption[];
  onCreated: () => void;
};

export function CreateBugPoolDefectModal(props: Props) {
  const { isOpen, onClose, workspaceSlug, scopedProjectId, workspaceProjects, onCreated } = props;
  const { t } = useTranslation();
  const [projectIdState, setProjectIdState] = useState<string>(scopedProjectId ?? ALL_PROJECTS);
  const [parentIssue, setParentIssue] = useState<ISearchIssueResponse | null>(null);
  const [pickParentOpen, setPickParentOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveProjectId = useMemo(() => {
    if (scopedProjectId) return scopedProjectId;
    if (workspaceProjects.length === 1) return workspaceProjects[0]?.id;
    if (projectIdState !== ALL_PROJECTS) return projectIdState;
    return undefined;
  }, [scopedProjectId, workspaceProjects, projectIdState]);

  useEffect(() => {
    if (!isOpen) {
      setParentIssue(null);
      setName("");
      setPickParentOpen(false);
      setSubmitting(false);
      setProjectIdState(scopedProjectId ?? ALL_PROJECTS);
    }
  }, [isOpen, scopedProjectId]);

  useEffect(() => {
    setParentIssue(null);
  }, [effectiveProjectId]);

  const handleClose = () => onClose();

  const canPickParent = !!effectiveProjectId;

  const handleSubmit = async () => {
    if (!effectiveProjectId) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: t("bug_pool.create.pick_project_hint"),
      });
      return;
    }
    setSubmitting(true);
    const result = await tryCreateDefectForTask({
      name,
      taskId: parentIssue?.id,
      create: (payload) => defectService.create(workspaceSlug, effectiveProjectId, payload),
    });
    setSubmitting(false);
    if (result.ok) {
      setToast({ type: TOAST_TYPE.SUCCESS, title: t("toast.success"), message: t("defect_panel.created") });
      handleClose();
      onCreated();
      return;
    }
    if (result.reason === "empty_name") {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("toast.error"),
        message: t("bug_pool.create.validation_name"),
      });
      return;
    }
    setToast({ type: TOAST_TYPE.ERROR, title: t("toast.error"), message: t("defect_panel.create_error") });
  };

  const showProjectSelect = !scopedProjectId && workspaceProjects.length > 1;

  const projectTitle = useMemo(() => {
    if (!effectiveProjectId) return "";
    return workspaceProjects.find((p) => p.id === effectiveProjectId)?.name ?? "";
  }, [workspaceProjects, effectiveProjectId]);

  /** CustomSelect only renders `label` in the trigger, not the selected Option children */
  const projectSelectButtonLabel =
    projectIdState === ALL_PROJECTS
      ? t("bug_pool.create.select_project_first")
      : (workspaceProjects.find((p) => p.id === projectIdState)?.name ?? t("bug_pool.create.select_project_first"));

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.LG}>
      <div className="p-5">
        <h3 className="text-h4-medium text-primary">{t("bug_pool.create.title")}</h3>
        <p className="mt-2 text-13 text-secondary">{t("bug_pool.create.description")}</p>

        {showProjectSelect && (
          <div className="mt-4">
            <label className="mb-1 block text-13 text-secondary">{t("bug_pool.filter_project")}</label>
            <CustomSelect
              value={projectIdState}
              onChange={(v: string) => setProjectIdState(v)}
              label={
                <span className="min-w-0 flex-1 truncate text-left text-13 text-primary">
                  {projectSelectButtonLabel}
                </span>
              }
              input
              buttonClassName="border border-subtle w-full min-w-0"
            >
              <CustomSelect.Option key={ALL_PROJECTS} value={ALL_PROJECTS}>
                {t("bug_pool.create.select_project_first")}
              </CustomSelect.Option>
              {workspaceProjects.map((p) => (
                <CustomSelect.Option key={p.id} value={p.id}>
                  {p.name}
                </CustomSelect.Option>
              ))}
            </CustomSelect>
          </div>
        )}

        {!showProjectSelect && projectTitle ? (
          <p className="mt-4 text-13 text-secondary">
            {t("common.project")}: <span className="text-primary">{projectTitle}</span>
          </p>
        ) : null}

        <div className="mt-4">
          <label className="mb-1 block text-13 text-secondary">{t("bug_pool.create.parent_work_item")}</label>
          {parentIssue ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-subtle bg-layer-1 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <IssueIdentifier
                  projectId={parentIssue.project_id}
                  issueTypeId={parentIssue.type_id}
                  projectIdentifier={parentIssue.project__identifier}
                  issueSequenceId={parentIssue.sequence_id}
                  size="xs"
                  variant="secondary"
                />
                <span className="truncate text-13 text-primary">{parentIssue.name}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setPickParentOpen(true)} disabled={!canPickParent}>
                {t("bug_pool.create.change_parent")}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setPickParentOpen(true)}
              disabled={!canPickParent}
            >
              {t("bug_pool.create.pick_parent_button")}
            </Button>
          )}
          {!canPickParent && showProjectSelect && (
            <p className="mt-1 text-11 text-secondary">{t("bug_pool.create.pick_project_hint")}</p>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-13 text-secondary">{t("defect_panel.title")}</label>
          <input
            type="text"
            className="focus:border-primary w-full rounded-md border border-subtle bg-surface-1 px-3 py-2 text-body-sm-regular outline-none placeholder:text-placeholder"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("defect_panel.name_placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void handleSubmit()} loading={submitting} disabled={!name.trim()}>
            {t("bug_pool.create.submit")}
          </Button>
        </div>
      </div>
      <PickParentIssueModal
        workspaceSlug={workspaceSlug}
        projectId={effectiveProjectId}
        isOpen={pickParentOpen}
        onClose={() => setPickParentOpen(false)}
        onConfirm={(issue) => setParentIssue(issue)}
      />
    </ModalCore>
  );
}
