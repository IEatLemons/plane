/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { Combobox } from "@headlessui/react";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { SearchIcon } from "@plane/propel/icons";
import type { ISearchIssueResponse } from "@plane/types";
import { EModalPosition, EModalWidth, Loader, ModalCore } from "@plane/ui";
import { generateWorkItemLink, getTabIndex } from "@plane/utils";
import useDebounce from "@/hooks/use-debounce";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
import { ProjectService } from "@/services/project";
import { IssueSearchModalEmptyState } from "@/components/core/modals/issue-search-modal-empty-state";

const projectService = new ProjectService();

type Props = {
  workspaceSlug: string | undefined;
  projectId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
  /** Invoked with the selected work item when user confirms */
  onConfirm: (issue: ISearchIssueResponse) => void;
};

export function PickParentIssueModal(props: Props) {
  const { workspaceSlug, projectId, isOpen, onClose, onConfirm } = props;
  const { t } = useTranslation();
  const { isMobile } = usePlatformOS();
  const { baseTabIndex } = getTabIndex(undefined, isMobile);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [issues, setIssues] = useState<ISearchIssueResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<ISearchIssueResponse | null>(null);

  const handleClose = () => {
    onClose();
    setSearchTerm("");
    setSelected(null);
    setIssues([]);
  };

  useEffect(() => {
    if (!isOpen || !workspaceSlug || !projectId) return;
    setIsSearching(true);
    setIsLoading(true);
    projectService
      .projectIssuesSearch(workspaceSlug, projectId, {
        search: debouncedSearchTerm,
        workspace_search: false,
      })
      .then(setIssues)
      .finally(() => {
        setIsSearching(false);
        setIsLoading(false);
      });
    // search is scoped to the selected project only
  }, [debouncedSearchTerm, isOpen, projectId, workspaceSlug]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSelected(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!selected) return;
    onConfirm(selected);
    handleClose();
  };

  return (
    <ModalCore isOpen={isOpen} handleClose={handleClose} position={EModalPosition.CENTER} width={EModalWidth.XXL}>
      <Combobox value={selected} onChange={setSelected}>
        <div className="relative m-1">
          <SearchIcon
            className="text-opacity-40 pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-primary"
            aria-hidden="true"
          />
          <Combobox.Input
            className="h-12 w-full border-0 bg-transparent pr-4 pl-11 text-13 text-primary outline-none placeholder:text-placeholder focus:ring-0"
            placeholder={t("bug_pool.create.select_parent_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            tabIndex={baseTabIndex}
            displayValue={() => ""}
          />
        </div>

        <div className="p-2 text-13 text-secondary">
          {selected ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-subtle bg-layer-1 py-1 pl-2 text-11 text-primary">
              <IssueIdentifier
                projectId={selected.project_id}
                issueTypeId={selected.type_id}
                projectIdentifier={selected.project__identifier}
                issueSequenceId={selected.sequence_id}
                size="xs"
                variant="secondary"
              />
              <span className="truncate">{selected.name}</span>
            </div>
          ) : (
            <div className="rounded-md border border-subtle bg-layer-1 p-2 text-11 whitespace-nowrap text-placeholder">
              {t("bug_pool.create.no_parent_selected")}
            </div>
          )}
        </div>

        <Combobox.Options static className="vertical-scrollbar scrollbar-md max-h-80 scroll-py-2 overflow-y-auto">
          {isSearching || isLoading ? (
            <Loader className="space-y-3 p-3">
              <Loader.Item height="40px" />
              <Loader.Item height="40px" />
              <Loader.Item height="40px" />
            </Loader>
          ) : issues.length === 0 ? (
            <IssueSearchModalEmptyState
              debouncedSearchTerm={debouncedSearchTerm}
              isSearching={isSearching}
              issues={issues}
              searchTerm={searchTerm}
            />
          ) : (
            <ul className="p-2 text-13 text-primary">
              {issues.map((issue) => (
                <Combobox.Option
                  key={issue.id}
                  value={issue}
                  className={({ active, selected: isSel }) =>
                    `group my-0.5 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-secondary select-none ${
                      active || isSel ? "bg-layer-1 text-primary" : ""
                    }`
                  }
                >
                  <div className="flex min-w-0 items-center gap-2 truncate">
                    <span
                      className="block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: issue.state__color }}
                    />
                    <IssueIdentifier
                      projectId={issue.project_id}
                      issueTypeId={issue.type_id}
                      projectIdentifier={issue.project__identifier}
                      issueSequenceId={issue.sequence_id}
                      size="xs"
                      variant="secondary"
                    />
                    <span className="truncate">{issue.name}</span>
                  </div>
                  <a
                    href={generateWorkItemLink({
                      workspaceSlug,
                      projectId: issue.project_id,
                      issueId: issue.id,
                      projectIdentifier: issue.project__identifier,
                      sequenceId: issue.sequence_id,
                    })}
                    target="_blank"
                    className="relative z-1 hidden flex-shrink-0 text-secondary group-hover:block hover:text-primary"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Rocket className="h-4 w-4" />
                  </a>
                </Combobox.Option>
              ))}
            </ul>
          )}
        </Combobox.Options>
      </Combobox>

      <div className="flex items-center justify-end gap-2 p-3">
        <Button variant="secondary" size="lg" onClick={handleClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" size="lg" onClick={handleSubmit} disabled={!selected}>
          {t("bug_pool.create.confirm_parent")}
        </Button>
      </div>
    </ModalCore>
  );
}
