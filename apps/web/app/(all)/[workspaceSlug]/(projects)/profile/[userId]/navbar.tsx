/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
// plane imports
import { PROFILE_VIEWER_TAB, PROFILE_ADMINS_TAB, PROFILE_WORK_REPORT_TAB } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Header, EHeaderVariant } from "@plane/ui";
import { EUserWorkspaceRoles } from "@plane/types";
import { cn } from "@plane/utils";
// hooks
import { useUser, useUserPermissions } from "@/hooks/store/user";

type Props = {
  isAuthorized: boolean;
};

export function ProfileNavbar(props: Props) {
  const { isAuthorized } = props;
  const { t } = useTranslation();
  const { workspaceSlug, userId } = useParams();
  const pathname = usePathname();
  const { data: currentUser } = useUser();
  const { getWorkspaceRoleByWorkspaceSlug } = useUserPermissions();

  const ws = workspaceSlug?.toString() ?? "";
  const uid = userId?.toString() ?? "";
  const workspaceRole = ws ? getWorkspaceRoleByWorkspaceSlug(ws) : undefined;
  const showWorkReport = !!currentUser && (currentUser.id === uid || workspaceRole === EUserWorkspaceRoles.ADMIN);

  let tabsList = [...PROFILE_VIEWER_TAB];
  if (isAuthorized) tabsList = [...tabsList, ...PROFILE_ADMINS_TAB];
  if (showWorkReport) tabsList = [...tabsList, PROFILE_WORK_REPORT_TAB];

  const tabHref = (route: string) =>
    route ? `/${workspaceSlug}/profile/${userId}/${route}/` : `/${workspaceSlug}/profile/${userId}/`;

  return (
    <Header variant={EHeaderVariant.SECONDARY} showOnMobile={false}>
      <div className="flex items-center overflow-x-scroll">
        {tabsList.map((tab) => (
          <Link key={tab.key} href={tabHref(tab.route)}>
            <span
              className={cn(
                `flex border-b-2 p-4 text-13 font-medium whitespace-nowrap text-tertiary outline-none hover:text-primary ${
                  pathname === `/${workspaceSlug}/profile/${userId}${tab.selected}`
                    ? "border-accent-strong text-accent-primary hover:text-accent-primary"
                    : "border-transparent"
                }`
              )}
            >
              {t(tab.i18n_label)}
            </span>
          </Link>
        ))}
      </div>
    </Header>
  );
}
