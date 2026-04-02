/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/** Spreads hash values around the hue wheel (degrees); reduces “adjacent bucket” collisions vs. small fixed palettes. */
const GOLDEN_ANGLE_DEG = 137.5080529395787;

function fnv1a32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic accent for a project id (Plane has no per-project theme color in the API).
 * Uses HSL with hue spread via golden-angle mapping so distinct ids tend to look farther apart than a 12-slot palette.
 */
export function getStableProjectAccentColor(projectId: string | null | undefined): string | undefined {
  if (!projectId) return undefined;
  const h = fnv1a32(projectId);
  const hue = (h * GOLDEN_ANGLE_DEG) % 360;
  const hueNorm = hue < 0 ? hue + 360 : hue;
  // Saturated, mid-dark: readable as a thin strip on tinted Gantt bars in light and dark UI.
  return `hsl(${Math.round(hueNorm)}, 73%, 38%)`;
}
