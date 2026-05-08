/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { PageHead } from "@/components/core/page-title";
import { WorkspaceRequirementPoolRoot } from "@/components/workspace/requirement-pool/root";

type PageProps = {
  params: { workspaceSlug: string };
};

export default function WorkspaceRequirementPoolPage({ params }: PageProps) {
  const { workspaceSlug } = params;

  return (
    <>
      <PageHead title="Requirement pool" />
      <div className="relative h-full w-full overflow-hidden overflow-y-auto">
        <WorkspaceRequirementPoolRoot workspaceSlug={workspaceSlug} />
      </div>
    </>
  );
}
