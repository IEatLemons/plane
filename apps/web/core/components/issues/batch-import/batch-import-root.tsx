/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { Link } from "react-router";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { EIssuesStoreType } from "@plane/types";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import {
  cn,
  createIssuePayload,
  mergeBatchDraftForCreate,
  parseBatchIssueJson,
  type TBatchIssueDraft,
} from "@plane/utils";
import { v4 as uuidv4 } from "uuid";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
import { useIssues } from "@/hooks/store/use-issues";
import { useProjectState } from "@/hooks/store/use-project-state";
import { useUserPermissions } from "@/hooks/store/user";

const SAMPLE_JSON = `{
  "schedule": {
    "mode": "sequential",
    "step_days": 1,
    "duration_days": 2
  },
  "items": [
    {
      "import_key": "milestone-design",
      "name": "示例：设计阶段",
      "priority": "high"
    },
    {
      "import_key": "task-ui",
      "parent_import_key": "milestone-design",
      "name": "示例：登录页样式",
      "description_html": "<p>子工作项</p>"
    },
    {
      "name": "示例：嵌套导入",
      "children": [
        { "name": "子项 A" },
        { "name": "子项 B", "priority": "low" }
      ]
    }
  ]
}`;

type DraftRow = {
  key: string;
  draft: TBatchIssueDraft;
  skip: boolean;
};

type Props = {
  workspaceSlug: string;
  projectId: string;
};

export const BatchImportRoot = observer(function BatchImportRoot(props: Props) {
  const { workspaceSlug, projectId } = props;
  const { t } = useTranslation();
  const { issues } = useIssues(EIssuesStoreType.PROJECT);
  const { fetchProjectStates, getProjectDefaultStateId, getProjectStateIds } = useProjectState();
  const { allowPermissions } = useUserPermissions();

  const canCreate = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [applyScheduleFromJson, setApplyScheduleFromJson] = useState(true);

  useEffect(() => {
    void fetchProjectStates(workspaceSlug, projectId);
  }, [fetchProjectStates, workspaceSlug, projectId]);

  const defaultStateId = useMemo(() => {
    const def = getProjectDefaultStateId(projectId);
    if (def) return def;
    const ids = getProjectStateIds(projectId);
    return ids?.[0];
  }, [getProjectDefaultStateId, getProjectStateIds, projectId]);

  const handleParse = useCallback(() => {
    setParseError(null);
    const result = parseBatchIssueJson(jsonText, { applySchedule: applyScheduleFromJson });
    if (!result.ok) {
      setParseError(result.error);
      setRows([]);
      return;
    }
    setRows(
      result.items.map((draft) => ({
        key: uuidv4(),
        draft,
        skip: false,
      }))
    );
  }, [jsonText, applyScheduleFromJson]);

  const updateDraft = useCallback((key: string, patch: Partial<TBatchIssueDraft>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, draft: { ...r.draft, ...patch } } : r)));
  }, []);

  const toggleSkip = useCallback((key: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, skip: !r.skip } : r)));
  }, []);

  const copySample = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_JSON);
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("issue_batch_import.copy_success_title"),
        message: t("issue_batch_import.copy_success_message"),
      });
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: t("issue_batch_import.copy_error"),
      });
    }
  }, [t]);

  const handlePublish = useCallback(async () => {
    if (!defaultStateId) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: t("issue_batch_import.no_default_state"),
      });
      return;
    }
    const toCreate = rows.filter((r) => !r.skip);
    if (toCreate.length === 0) {
      setToast({
        type: TOAST_TYPE.WARNING,
        title: t("issue_batch_import.nothing_to_publish_title"),
        message: t("issue_batch_import.nothing_to_publish_message"),
      });
      return;
    }

    setPublishing(true);
    try {
      const importKeyToId = new Map<string, string>();
      /* Sequential creation: stop on first API error and preserve predictable order. */
      for (let i = 0; i < toCreate.length; i++) {
        const { draft } = toCreate[i];
        const name = draft.name.trim();
        if (!name) {
          setPublishing(false);
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("common.error.label"),
            message: t("issue_batch_import.empty_name_at", { index: i + 1 }),
          });
          return;
        }
        if (draft.parent_import_key) {
          const resolved = importKeyToId.get(draft.parent_import_key);
          if (!resolved) {
            setPublishing(false);
            setToast({
              type: TOAST_TYPE.ERROR,
              title: t("common.error.label"),
              message: t("issue_batch_import.missing_parent_import_key", {
                key: draft.parent_import_key,
              }),
            });
            return;
          }
          const merged = mergeBatchDraftForCreate({ ...draft, name }, defaultStateId, resolved);
          const payload = createIssuePayload(projectId, merged);
          // eslint-disable-next-line no-await-in-loop -- must await each create in order
          const created = await issues.createIssue(workspaceSlug, projectId, payload);
          if (draft.import_key) {
            importKeyToId.set(draft.import_key, created.id);
          }
          continue;
        }
        const merged = mergeBatchDraftForCreate({ ...draft, name }, defaultStateId);
        const payload = createIssuePayload(projectId, merged);
        // eslint-disable-next-line no-await-in-loop -- must await each create in order
        const created = await issues.createIssue(workspaceSlug, projectId, payload);
        if (draft.import_key) {
          importKeyToId.set(draft.import_key, created.id);
        }
      }
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("common.success"),
        message: t("issue_batch_import.publish_success", { count: toCreate.length }),
      });
      setRows([]);
      setJsonText("");
    } catch (e: unknown) {
      let message = t("issue_batch_import.publish_error");
      if (typeof e === "object" && e !== null) {
        const err = e as { message?: string; error?: string; detail?: string };
        if (typeof err.error === "string") message = err.error;
        else if (typeof err.detail === "string") message = err.detail;
        else if (typeof err.message === "string") message = err.message;
      }
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message,
      });
    } finally {
      setPublishing(false);
    }
  }, [defaultStateId, issues, projectId, rows, t, workspaceSlug]);

  if (!canCreate) {
    return <div className="text-13 text-secondary">{t("you_do_not_have_the_permission_to_access_this_page")}</div>;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-16 font-medium text-primary">{t("issue_batch_import.title")}</h2>
        <Link
          to={`/${workspaceSlug}/projects/${projectId}/issues/`}
          className="text-13 text-link-primary hover:underline"
        >
          {t("issue_batch_import.back_to_list")}
        </Link>
      </div>

      <section className="flex flex-col gap-2 rounded-lg border border-subtle bg-layer-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-13 font-semibold text-primary">{t("issue_batch_import.sample_heading")}</h3>
          <Button type="button" variant="secondary" size="base" onClick={() => void copySample()}>
            {t("issue_batch_import.copy_sample")}
          </Button>
        </div>
        <pre className="vertical-scrollbar scrollbar-sm max-h-48 overflow-auto rounded-md border border-subtle bg-layer-1 p-3 text-12 text-secondary">
          {SAMPLE_JSON}
        </pre>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-13 font-medium text-primary" htmlFor="batch-import-json">
          {t("issue_batch_import.json_label")}
        </label>
        <textarea
          id="batch-import-json"
          className="font-mono min-h-40 rounded-lg border border-subtle bg-layer-2 px-3 py-2 text-12 text-primary outline-none focus:border-accent-strong"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={t("issue_batch_import.json_placeholder")}
        />
        {parseError ? <p className="text-red-500 text-12">{parseError}</p> : null}
        <label className="flex cursor-pointer items-center gap-2 text-12 text-secondary">
          <input type="checkbox" checked={applyScheduleFromJson} onChange={() => setApplyScheduleFromJson((v) => !v)} />
          {t("issue_batch_import.apply_schedule_checkbox")}
        </label>
        <div>
          <Button type="button" variant="secondary" onClick={handleParse}>
            {t("issue_batch_import.parse")}
          </Button>
        </div>
      </section>

      {rows.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-13 font-semibold text-primary">{t("issue_batch_import.drafts_heading")}</h3>
          <ul className="flex flex-col gap-4">
            {rows.map((row, index) => (
              <li key={row.key} className="rounded-lg border border-subtle bg-layer-2 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-12 font-medium text-tertiary">
                    {t("issue_batch_import.row_label", { index: index + 1 })}
                  </span>
                  <label className="flex cursor-pointer items-center gap-2 text-12 text-secondary">
                    <input type="checkbox" checked={row.skip} onChange={() => toggleSkip(row.key)} />
                    {t("issue_batch_import.skip_row")}
                  </label>
                </div>
                <div className={cn("flex flex-col gap-3", row.skip && "opacity-50")}>
                  <label className="flex flex-col gap-1">
                    <span className="text-12 text-secondary">{t("name")}</span>
                    <input
                      type="text"
                      className="rounded-md border border-subtle bg-layer-1 px-2 py-1.5 text-13 text-primary outline-none focus:border-accent-strong"
                      value={row.draft.name}
                      disabled={row.skip}
                      onChange={(e) => updateDraft(row.key, { name: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-12 text-secondary">{t("description")}</span>
                    <textarea
                      className="font-mono min-h-20 rounded-md border border-subtle bg-layer-1 px-2 py-1.5 text-12 text-primary outline-none focus:border-accent-strong"
                      value={row.draft.description_html ?? ""}
                      disabled={row.skip}
                      onChange={(e) => updateDraft(row.key, { description_html: e.target.value })}
                    />
                  </label>
                  {(row.draft.import_key || row.draft.parent_import_key || row.draft.parent_id) && (
                    <div className="flex flex-wrap gap-3 text-12 text-tertiary">
                      {row.draft.import_key ? (
                        <span>
                          {t("issue_batch_import.import_key_label")}: {row.draft.import_key}
                        </span>
                      ) : null}
                      {row.draft.parent_import_key ? (
                        <span>
                          {t("issue_batch_import.parent_import_key_label")}: {row.draft.parent_import_key}
                        </span>
                      ) : null}
                      {row.draft.parent_id ? (
                        <span>
                          {t("issue_batch_import.parent_id_label")}: {row.draft.parent_id}
                        </span>
                      ) : null}
                    </div>
                  )}
                  {(row.draft.start_date || row.draft.target_date) && (
                    <div className="text-12 text-tertiary">
                      {row.draft.start_date
                        ? `${t("issue_batch_import.start_date_label")}: ${row.draft.start_date}`
                        : ""}
                      {row.draft.start_date && row.draft.target_date ? " · " : ""}
                      {row.draft.target_date
                        ? `${t("issue_batch_import.target_date_label")}: ${row.draft.target_date}`
                        : ""}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <div className="h-7">
                      <StateDropdown
                        value={row.draft.state_id ?? defaultStateId ?? ""}
                        onChange={(stateId) => updateDraft(row.key, { state_id: stateId })}
                        projectId={projectId}
                        buttonVariant="border-with-text"
                        disabled={row.skip}
                        isForWorkItemCreation
                      />
                    </div>
                    <div className="h-7">
                      <PriorityDropdown
                        value={row.draft.priority ?? "none"}
                        onChange={(priority) => updateDraft(row.key, { priority })}
                        buttonVariant="border-with-text"
                        disabled={row.skip}
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              loading={publishing}
              disabled={publishing || !defaultStateId}
              onClick={() => void handlePublish()}
            >
              {t("issue_batch_import.publish")}
            </Button>
            {!defaultStateId ? (
              <span className="text-amber-600 text-12">{t("issue_batch_import.no_default_state")}</span>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
});
