/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { observer } from "mobx-react";
import type { IWorkspaceRequirementPoolItem } from "@plane/types";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { Checkbox, EModalWidth, ModalCore } from "@plane/ui";
import { InboxIssueCreateRoot } from "@/components/inbox/modals/create-modal/create-root";
import { useProject } from "@/hooks/store/use-project";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { WorkspaceService } from "@/services/workspace.service";

const workspaceService = new WorkspaceService();

type Props = {
  workspaceSlug: string;
};

export const WorkspaceRequirementPoolRoot = observer(function WorkspaceRequirementPoolRoot(props: Props) {
  const { workspaceSlug } = props;
  const { t } = useTranslation();
  const { getWorkspaceBySlug } = useWorkspace();
  const { projectMap, fetchProjects } = useProject();
  const [items, setItems] = useState<IWorkspaceRequirementPoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [submissionProjectIds, setSubmissionProjectIds] = useState<string[]>([]);

  const workspace = getWorkspaceBySlug(workspaceSlug);

  const intakeProjects = useMemo(() => {
    if (!workspace?.id) return [];
    return Object.values(projectMap).filter((p) => p.workspace === workspace.id && p.inbox_view && !p.archived_at);
  }, [projectMap, workspace?.id]);

  const primaryProjectId = submissionProjectIds[0] ?? "";

  const loadPool = useCallback(() => {
    setLoading(true);
    return workspaceService
      .fetchWorkspaceRequirementPool(workspaceSlug)
      .then((res) => setItems(res.results))
      .finally(() => setLoading(false));
  }, [workspaceSlug]);

  useEffect(() => {
    void fetchProjects(workspaceSlug);
  }, [workspaceSlug, fetchProjects]);

  useEffect(() => {
    void loadPool();
  }, [loadPool]);

  useEffect(() => {
    setSubmissionProjectIds((prev) => {
      if (intakeProjects.length === 0) return [];
      const valid = prev.filter((id) => intakeProjects.some((p) => p.id === id));
      if (valid.length > 0) return valid;
      return [intakeProjects[0].id];
    });
  }, [intakeProjects]);

  const toggleSubmissionProject = useCallback((projectId: string) => {
    setSubmissionProjectIds((prev) => {
      if (prev.includes(projectId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== projectId);
      }
      return [...prev, projectId];
    });
  }, []);

  const handleCloseCreate = () => {
    setCreateModalOpen(false);
    void loadPool();
  };

  return (
    <div className="flex h-full w-full flex-col p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-20 font-semibold text-primary">{t("requirement_pool")}</h1>
        <div className="flex flex-wrap items-center gap-4">
          {intakeProjects.length > 0 && (
            <div className="flex min-w-52 flex-col gap-2 rounded-md border border-subtle px-3 py-2">
              <span className="text-13 text-secondary">{t("requirement_pool_select_projects")}</span>
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                {intakeProjects.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 text-13 text-primary">
                    <Checkbox
                      checked={submissionProjectIds.includes(p.id)}
                      onChange={() => toggleSubmissionProject(p.id)}
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            disabled={submissionProjectIds.length === 0 || intakeProjects.length === 0}
          >
            {t("new_issue")}
          </Button>
        </div>
      </div>
      {loading ? (
        <p className="text-13 text-placeholder">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-13 text-placeholder">{t("requirement_pool_empty")}</p>
      ) : (
        <ul className="divide-y divide-subtle overflow-y-auto rounded-md border border-subtle">
          {items.map((row) => (
            <li key={row.id} className="px-4 py-3">
              <Link
                href={`/${workspaceSlug}/projects/${row.project_id}/intake/?currentTab=open&inboxIssueId=${row.issue_id}`}
                className="text-13 font-medium text-primary hover:underline"
              >
                {row.project_identifier}-{row.issue_sequence_id}: {row.issue_name}
              </Link>
              <div className="text-11 text-placeholder">{row.project_name}</div>
            </li>
          ))}
        </ul>
      )}
      {createModalOpen && primaryProjectId && (
        <ModalCore
          isOpen={createModalOpen}
          handleClose={handleCloseCreate}
          width={EModalWidth.XXXXL}
          className="rounded-lg !bg-transparent shadow-none"
        >
          <InboxIssueCreateRoot
            workspaceSlug={workspaceSlug}
            projectId={primaryProjectId}
            submissionProjectIds={submissionProjectIds}
            handleModalClose={handleCloseCreate}
            isDuplicateModalOpen={isDuplicateModalOpen}
            handleDuplicateIssueModal={setIsDuplicateModalOpen}
          />
        </ModalCore>
      )}
    </div>
  );
});
