/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import BoringAvatar from "boring-avatars";
import { cn, getFileURL } from "@plane/utils";

type Props = {
  /** Stable seed (prefer user id) for generated avatar when `src` is absent */
  seed: string;
  size: number;
  /** Optional profile image URL (relative or absolute); takes precedence over generator */
  avatarUrl?: string | null;
  className?: string;
  /** Decorative: hide from assistive tech when redundant with surrounding label */
  "aria-hidden"?: boolean | "true" | "false";
};

export function MemberBoringAvatar(props: Props) {
  const { seed, size, avatarUrl, className, ...rest } = props;
  const src = avatarUrl ? getFileURL(avatarUrl) : undefined;

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        {...rest}
      />
    );
  }

  return (
    <span
      className={cn("inline-flex shrink-0 overflow-hidden rounded-full leading-none", className)}
      style={{ width: size, height: size }}
      {...rest}
    >
      <BoringAvatar size={size} name={seed} variant="beam" title={false} />
    </span>
  );
}
