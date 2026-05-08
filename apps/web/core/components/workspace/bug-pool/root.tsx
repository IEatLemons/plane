/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { observer } from "mobx-react";
import type { IWorkspaceBugPoolItem } from "@plane/types";
import { CustomSelect } from "@plane/ui";
import { Button } from "@plane/propel/button";
import { useTranslation } from "@plane/i18n";
import { useProject } from "@/hooks/store/use-project";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { WorkspaceService } from "@/services/workspace.service";

const workspaceService = new WorkspaceService();

const ALL_PROJECTS = "__all_projects__";

type Props = {
  workspaceSlug: string;
  /** When set (project sidebar), list is scoped to this project only. */
  scopedProjectId?: string;
};

export const WorkspaceBugPoolRoot = observer(function WorkspaceBugPoolRoot(props: Props) {
  const { workspaceSlug, scopedProjectId } = props;
  const { t } = useTranslation();
  const { getWorkspaceBySlug } = useWorkspace();
  const { projectMap, fetchProjects } = useProject();
  const [items, setItems] = useState<IWorkspaceBugPoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string>(ALL_PROJECTS);

  const workspace = getWorkspaceBySlug(workspaceSlug);

  const workspaceProjects = useMemo(() => {
    if (!workspace?.id) return [];
    return Object.values(projectMap).filter((p) => p.workspace === workspace.id && !p.archived_at);
  }, [projectMap, workspace?.id]);

  const apiProjectFilter =
    scopedProjectId || (filterProjectId !== ALL_PROJECTS ? filterProjectId : undefined) || undefined;

  const fetchPage = useCallback(
    async (cursor: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await workspaceService.fetchWorkspaceBugPool(workspaceSlug, {
          project_id: apiProjectFilter,
          cursor,
          per_page: 50,
        });
        setItems((prev) => (append ? [...prev, ...res.results] : res.results));
        setNextCursor(res.next_cursor);
      } finally {
        setLoading(false);
      }
    },
    [workspaceSlug, apiProjectFilter]
  );

  useEffect(() => {
    void fetchProjects(workspaceSlug);
  }, [workspaceSlug, fetchProjects]);

  useEffect(() => {
    void fetchPage(0, false);
  }, [fetchPage]);

  return (
    <div className="flex h-full w-full flex-col p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-20 font-semibold text-primary">{t("bug_pool.title")}</h1>
          <p className="mt-1 text-13 text-secondary">{t("bug_pool.description")}</p>
        </div>
        {!scopedProjectId && workspaceProjects.length > 1 && (
          <CustomSelect
            value={filterProjectId}
            onChange={(v: string) => setFilterProjectId(v)}
            label={<span className="text-13 text-secondary">{t("bug_pool.filter_project")}</span>}
            buttonClassName="border border-subtle min-w-48"
          >
            <CustomSelect.Option key={ALL_PROJECTS} value={ALL_PROJECTS}>
              {t("bug_pool.all_projects")}
            </CustomSelect.Option>
            {workspaceProjects.map((p) => (
              <CustomSelect.Option key={p.id} value={p.id}>
                {p.name}
              </CustomSelect.Option>
            ))}
          </CustomSelect>
        )}
      </div>
      {loading && items.length === 0 ? (
        <p className="text-13 text-placeholder">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-13 text-placeholder">{t("bug_pool.empty")}</p>
      ) : (
        <>
          <ul className="divide-y divide-subtle overflow-y-auto rounded-md border border-subtle">
            {items.map((row) => {
              const childHref = `/${workspaceSlug}/projects/${row.project_id}/issues/${row.id}/`;
              const parentLabel =
                row.parent_sequence_id != null && row.project_identifier && row.parent_name
                  ? `${row.project_identifier}-${row.parent_sequence_id}: ${row.parent_name}`
                  : row.parent_name || "—";

              return (
                <li key={row.id} className="px-4 py-3">
                  <Link href={childHref} className="text-13 font-medium text-primary hover:underline">
                    {row.project_identifier}-{row.sequence_id}: {row.name}
                  </Link>
                  <div className="mt-1 text-11 text-placeholder">
                    {row.project_name} · <span title={t("bug_pool.parent_work_item_hint")}>{parentLabel}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {nextCursor != null && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void fetchPage(nextCursor, true)}
                disabled={loading}
                loading={loading}
              >
                {t("load_more")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
});
