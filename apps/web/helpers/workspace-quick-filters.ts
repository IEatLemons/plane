/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { addDays } from "date-fns";
// plane imports
import type { IWorkItemFilterInstance, TWorkItemFilterCondition } from "@plane/shared-state";
import { buildWorkItemFilterExpressionFromConditions } from "@plane/shared-state";
import type { TWorkItemFilterExpression, TWorkItemFilterProperty } from "@plane/types";
import { COLLECTION_OPERATOR, COMPARISON_OPERATOR } from "@plane/types";
import { renderFormattedPayloadDate } from "@plane/utils";

/** Single-day due range as used by workspace issue filters (`after`/`before` pair). */
export const getTargetDateSingleDayRangeString = (date: Date): string => {
  const d = renderFormattedPayloadDate(date);
  return `${d};after,${d};before`;
};

export const getTargetDateTodayRangeString = (): string => getTargetDateSingleDayRangeString(new Date());

/** Inclusive window: today through today + 6 days (7 calendar days). */
export const getTargetDateNext7DaysRangeString = (): string => {
  const start = new Date();
  const end = addDays(start, 6);
  const startStr = renderFormattedPayloadDate(start);
  const endStr = renderFormattedPayloadDate(end);
  return `${startStr};after,${endStr};before`;
};

export type TWorkspaceQuickFilterPreset = "due_today" | "due_next_7_days" | "assigned_to_me";

const matchesRange = (value: unknown, expected: string): boolean => typeof value === "string" && value === expected;

export const isDueTodayFilterActive = (filter: IWorkItemFilterInstance): boolean => {
  const today = getTargetDateTodayRangeString();
  return filter.allConditionsForDisplay.some((c) => c.property === "target_date" && matchesRange(c.value, today));
};

export const isDueNext7DaysFilterActive = (filter: IWorkItemFilterInstance): boolean => {
  const expected = getTargetDateNext7DaysRangeString();
  return filter.allConditionsForDisplay.some((c) => c.property === "target_date" && matchesRange(c.value, expected));
};

export const isAssignedToMeFilterActive = (filter: IWorkItemFilterInstance, userId: string | undefined): boolean => {
  if (!userId) return false;
  return filter.allConditionsForDisplay.some(
    (c) =>
      c.property === "assignee_id" &&
      c.operator === COLLECTION_OPERATOR.IN &&
      (c.value === userId || (Array.isArray(c.value) && (c.value as string[]).includes(userId)))
  );
};

const toBuildConditions = (filter: IWorkItemFilterInstance): TWorkItemFilterCondition[] =>
  filter.allConditionsForDisplay.map((c) => ({
    property: c.property,
    operator: c.operator,
    value: c.value,
  }));

const stripProperties = (
  conditions: TWorkItemFilterCondition[],
  properties: TWorkItemFilterProperty[]
): TWorkItemFilterCondition[] => conditions.filter((c) => !properties.includes(c.property));

/**
 * Applies a workspace quick filter preset by rebuilding the rich filter expression.
 * Toggles off when the same preset is already active (except assigned_to_me checks assignee only).
 */
export const applyWorkspaceQuickFilterPreset = (
  filter: IWorkItemFilterInstance,
  preset: TWorkspaceQuickFilterPreset,
  currentUserId: string | undefined
): TWorkItemFilterExpression => {
  let conditions = toBuildConditions(filter);

  switch (preset) {
    case "due_today": {
      const todayRange = getTargetDateTodayRangeString();
      if (isDueTodayFilterActive(filter)) {
        conditions = stripProperties(conditions, ["target_date"]);
      } else {
        conditions = stripProperties(conditions, ["target_date"]);
        conditions.push({
          property: "target_date",
          operator: COMPARISON_OPERATOR.RANGE,
          value: todayRange,
        });
      }
      break;
    }
    case "due_next_7_days": {
      const weekRange = getTargetDateNext7DaysRangeString();
      if (isDueNext7DaysFilterActive(filter)) {
        conditions = stripProperties(conditions, ["target_date"]);
      } else {
        conditions = stripProperties(conditions, ["target_date"]);
        conditions.push({
          property: "target_date",
          operator: COMPARISON_OPERATOR.RANGE,
          value: weekRange,
        });
      }
      break;
    }
    case "assigned_to_me": {
      if (!currentUserId) break;
      if (isAssignedToMeFilterActive(filter, currentUserId)) {
        conditions = stripProperties(conditions, ["assignee_id"]);
      } else {
        conditions = stripProperties(conditions, ["assignee_id"]);
        conditions.push({
          property: "assignee_id",
          operator: COLLECTION_OPERATOR.IN,
          value: currentUserId,
        });
      }
      break;
    }
    default:
      break;
  }

  const built = buildWorkItemFilterExpressionFromConditions({ conditions });
  return built ?? {};
};
