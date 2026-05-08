/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";

import { Disclosure } from "@headlessui/react";
// plane imports
import {
  ROLE,
  EUserPermissions,
  EUserPermissionsLevel,
  MEMBER_TRACKER_ELEMENTS,
  WORKSPACE_JOB_POSITIONS,
} from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TrashIcon, SuspendedUserIcon } from "@plane/propel/icons";
import { Pill, EPillVariant, EPillSize } from "@plane/propel/pill";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IUser, IWorkspaceMember, TWorkspaceJobPosition } from "@plane/types";
// plane ui
import { CustomSelect, PopoverMenu, MultiSelectDropdown } from "@plane/ui";
// helpers
import { getFileURL } from "@plane/utils";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useUser, useUserPermissions } from "@/hooks/store/user";

export interface RowData {
  member: IWorkspaceMember;
  role: EUserPermissions;
  is_active: boolean;
}

type NameProps = {
  rowData: RowData;
  workspaceSlug: string;
  isAdmin: boolean;
  currentUser: IUser | undefined;
  setRemoveMemberModal: (rowData: RowData) => void;
};

type AccountTypeProps = {
  rowData: RowData;
  workspaceSlug: string;
};

export function NameColumn(props: NameProps) {
  const { rowData, workspaceSlug, isAdmin, currentUser, setRemoveMemberModal } = props;
  // derived values
  const { avatar_url, display_name, email, first_name, id, last_name } = rowData.member;
  const isSuspended = rowData.is_active === false;

  return (
    <Disclosure>
      {() => (
        <div className="group relative">
          <div className="flex w-72 items-center justify-between gap-x-4 gap-y-2">
            <div className="flex flex-1 items-center gap-x-2 gap-y-2">
              {isSuspended ? (
                <div className="rounded-full bg-layer-1">
                  <SuspendedUserIcon className="size-6 text-placeholder" />
                </div>
              ) : avatar_url && avatar_url.trim() !== "" ? (
                <Link href={`/${workspaceSlug}/profile/${id}`}>
                  <span className="relative flex size-6 items-center justify-center rounded-full text-on-color capitalize">
                    <img
                      src={getFileURL(avatar_url)}
                      className="absolute top-0 left-0 h-full w-full rounded-full object-cover"
                      alt={display_name || email}
                    />
                  </span>
                </Link>
              ) : (
                <Link href={`/${workspaceSlug}/profile/${id}`}>
                  <span className="relative flex size-6 items-center justify-center rounded-full bg-layer-3 text-11 text-tertiary capitalize">
                    {(email ?? display_name ?? "?")[0]}
                  </span>
                </Link>
              )}
              <span className={isSuspended ? "text-placeholder" : ""}>
                {first_name} {last_name}
              </span>
            </div>

            {!isSuspended && (isAdmin || id === currentUser?.id) && (
              <PopoverMenu
                data={[""]}
                keyExtractor={(item) => item}
                popoverClassName="justify-end"
                buttonClassName="outline-none	origin-center rotate-90 size-8 aspect-square flex-shrink-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                render={() => (
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-x-3 border-none bg-transparent p-0"
                    onClick={() => setRemoveMemberModal(rowData)}
                    data-ph-element={MEMBER_TRACKER_ELEMENTS.WORKSPACE_MEMBER_TABLE_CONTEXT_MENU}
                  >
                    <TrashIcon className="size-3.5 align-middle" /> {id === currentUser?.id ? "Leave " : "Remove "}
                  </button>
                )}
              />
            )}
          </div>
        </div>
      )}
    </Disclosure>
  );
}

export const AccountTypeColumn = observer(function AccountTypeColumn(props: AccountTypeProps) {
  const { rowData, workspaceSlug } = props;
  // form info
  const {
    control,
    formState: { errors },
  } = useForm();
  // store hooks
  const { allowPermissions } = useUserPermissions();

  const {
    workspace: { updateMember },
  } = useMember();
  const { data: currentUser } = useUser();

  // derived values
  const isCurrentUser = currentUser?.id === rowData.member.id;
  const isAdminRole = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  const isRoleNonEditable = isCurrentUser || !isAdminRole;
  const isSuspended = rowData.is_active === false;

  return (
    <>
      {isSuspended ? (
        <div className="flex w-32">
          <Pill variant={EPillVariant.DEFAULT} size={EPillSize.SM} className="border-none">
            Suspended
          </Pill>
        </div>
      ) : isRoleNonEditable ? (
        <div className="flex w-32">
          <span>{ROLE[rowData.role]}</span>
        </div>
      ) : (
        <Controller
          name="role"
          control={control}
          rules={{ required: "Role is required." }}
          render={({ field: { value: roleValue } }) => (
            <CustomSelect
              value={roleValue as EUserPermissions}
              onChange={async (newRole: EUserPermissions) => {
                if (!workspaceSlug) return;
                try {
                  await updateMember(workspaceSlug.toString(), rowData.member.id, {
                    role: newRole as unknown as EUserPermissions,
                  });
                } catch (err: unknown) {
                  const error = err as { error?: string | string[] };
                  const errorString = Array.isArray(error?.error) ? error.error[0] : error?.error;

                  setToast({
                    type: TOAST_TYPE.ERROR,
                    title: "Error!",
                    message: errorString ?? "An error occurred while updating member role. Please try again.",
                  });
                }
              }}
              label={
                <div className="flex">
                  <span>{ROLE[rowData.role]}</span>
                </div>
              }
              buttonClassName={`!px-0 !justify-start hover:bg-surface-1 ${errors.role ? "border-danger-strong" : "border-none"}`}
              className="w-32 rounded-md p-0"
              input
            >
              {Object.keys(ROLE).map((item) => (
                <CustomSelect.Option key={item} value={item as unknown as EUserPermissions}>
                  {ROLE[item as unknown as keyof typeof ROLE]}
                </CustomSelect.Option>
              ))}
            </CustomSelect>
          )}
        />
      )}
    </>
  );
});

const JOB_POSITION_OPTIONS = WORKSPACE_JOB_POSITIONS.map((p) => ({
  value: "id" as const,
  data: { id: p },
}));

export const JobPositionsColumn = observer(function JobPositionsColumn(props: AccountTypeProps) {
  const { rowData, workspaceSlug } = props;
  const { t } = useTranslation();
  const { allowPermissions } = useUserPermissions();
  const {
    workspace: { updateMember },
  } = useMember();
  const { data: currentUser } = useUser();
  const record = rowData as unknown as IWorkspaceMember;
  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.WORKSPACE);
  const isCurrentUser = currentUser?.id === record.member?.id;
  const isSuspended = record.is_active === false;
  const canEdit = !isSuspended && (isAdmin || isCurrentUser);
  const positions = (record.job_positions ?? []) as TWorkspaceJobPosition[];

  if (isSuspended) {
    return <div className="w-56 text-11 text-placeholder">—</div>;
  }

  if (!canEdit) {
    return (
      <div className="flex max-w-56 flex-wrap gap-1">
        {positions.length === 0 ? (
          <span className="text-11 text-placeholder">—</span>
        ) : (
          positions.map((p) => (
            <Pill key={p} variant={EPillVariant.DEFAULT} size={EPillSize.SM} className="border-none">
              {t(`workspace_settings.settings.members.job_positions.labels.${p}`)}
            </Pill>
          ))
        )}
      </div>
    );
  }

  return (
    <MultiSelectDropdown
      value={positions}
      onChange={async (next) => {
        if (!workspaceSlug || !record.member?.id) return;
        const normalized = Array.from(new Set(next)) as TWorkspaceJobPosition[];
        try {
          await updateMember(workspaceSlug.toString(), record.member.id, { job_positions: normalized });
        } catch (err: unknown) {
          const error = err as { error?: string | string[] };
          const errorString = Array.isArray(error?.error) ? error.error[0] : error?.error;
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Error!",
            message: errorString ?? "Failed to update job positions.",
          });
        }
      }}
      options={JOB_POSITION_OPTIONS}
      keyExtractor={(o) => o.data.id}
      queryArray={["id"]}
      sortByKey="id"
      disableSearch
      buttonClassName="!justify-start !px-2 !py-1 text-left text-11 border border-subtle rounded-md min-w-48"
      buttonContent={(_, vals) => (
        <span className="text-secondary">
          {vals?.length
            ? `${vals.length} ${t("workspace_settings.settings.members.job_positions.selected_suffix")}`
            : t("workspace_settings.settings.members.job_positions.choose")}
        </span>
      )}
    />
  );
});
