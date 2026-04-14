/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams } from "react-router";
import { useTranslation } from "@plane/i18n";
import { PageHead } from "@/components/core/page-title";
import { BatchImportRoot } from "@/components/issues/batch-import/batch-import-root";
import { useProject } from "@/hooks/store/use-project";

function ProjectIssuesBatchImportPage() {
  const { workspaceSlug, projectId } = useParams();
  const { t } = useTranslation();
  const { getProjectById } = useProject();
  const project = projectId ? getProjectById(projectId.toString()) : undefined;
  const pageTitle = project?.name
    ? `${project.name} — ${t("issue_batch_import.title")}`
    : t("issue_batch_import.title");

  if (!workspaceSlug || !projectId) {
    return null;
  }

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="vertical-scrollbar scrollbar-md h-full w-full overflow-y-auto px-5 py-5 md:px-9">
        <BatchImportRoot workspaceSlug={workspaceSlug.toString()} projectId={projectId.toString()} />
      </div>
    </>
  );
}

export default observer(ProjectIssuesBatchImportPage);
