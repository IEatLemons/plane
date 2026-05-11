/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { describe, expect, it, vi } from "vitest";
import type { IDefect } from "@plane/types";
import { tryCreateDefectForTask } from "./try-create-defect-for-task";

describe("tryCreateDefectForTask", () => {
  it("returns empty_name when name is blank", async () => {
    const create = vi.fn();
    await expect(tryCreateDefectForTask({ name: "   ", taskId: "t1", create })).resolves.toEqual({
      ok: false,
      reason: "empty_name",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("trims name and calls create", async () => {
    const defect = { id: "d1" } as IDefect;
    const create = vi.fn().mockResolvedValue(defect);
    await expect(tryCreateDefectForTask({ name: "  My bug ", taskId: "task-uuid", create })).resolves.toEqual({
      ok: true,
      defect,
    });
    expect(create).toHaveBeenCalledWith({ name: "My bug", task_id: "task-uuid" });
  });

  it("omits task_id when taskId is absent", async () => {
    const defect = { id: "d1", task_id: null } as IDefect;
    const create = vi.fn().mockResolvedValue(defect);
    await expect(tryCreateDefectForTask({ name: "  Pool bug ", create })).resolves.toEqual({
      ok: true,
      defect,
    });
    expect(create).toHaveBeenCalledWith({ name: "Pool bug" });
  });

  it("returns create_failed on rejection", async () => {
    const err = new Error("nope");
    const create = vi.fn().mockRejectedValue(err);
    await expect(tryCreateDefectForTask({ name: "x", taskId: "t", create })).resolves.toEqual({
      ok: false,
      reason: "create_failed",
      error: err,
    });
  });
});
