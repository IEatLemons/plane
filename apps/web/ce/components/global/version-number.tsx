/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// assets
import { getGithubStarUrl } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import packageJson from "package.json";

export function PlaneVersionNumber() {
  const { t } = useTranslation();
  const repoUrl = getGithubStarUrl();

  return (
    <div className="flex flex-col gap-1">
      <span>
        {t("version")}: v{packageJson.version}
      </span>
      {repoUrl ? (
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-left text-primary underline-offset-2 hover:underline"
        >
          {t("source_repository")}
        </a>
      ) : null}
    </div>
  );
}
