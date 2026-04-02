/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { observer } from "mobx-react";
// types
import type { TIssue } from "@plane/types";
// components
import { Logo } from "@plane/propel/emoji-icon-picker";
import { FolderKanban } from "lucide-react";
// hooks
import { useProject } from "@/hooks/store/use-project";

type Props = {
  issue: TIssue;
  onClose: () => void;
  disabled: boolean;
  onChange: (issue: TIssue, data: Partial<TIssue>, updates?: unknown) => void;
};

export const SpreadsheetProjectColumn = observer(function SpreadsheetProjectColumn(props: Props) {
  const { issue } = props;
  const { getProjectById } = useProject();
  const project = issue.project_id ? getProjectById(issue.project_id) : undefined;

  return (
    <div className="flex h-11 min-w-36 items-center gap-2 border-b-[0.5px] border-subtle px-page-x">
      {project?.logo_props ? (
        <Logo logo={project.logo_props} size={18} />
      ) : (
        <FolderKanban className="h-4 w-4 flex-shrink-0 text-placeholder" aria-hidden />
      )}
      <span className="truncate text-13 text-primary">{project?.name ?? "—"}</span>
    </div>
  );
});
