/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { API_BASE_URL } from "@plane/constants";
import type { IDefect } from "@plane/types";
import { APIService } from "@/services/api.service";

export class DefectService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async list(workspaceSlug: string, projectId: string, params?: { task_id?: string }): Promise<IDefect[]> {
    const search = new URLSearchParams();
    if (params?.task_id) search.set("task_id", params.task_id);
    const q = search.toString();
    const path = `/api/workspaces/${workspaceSlug}/projects/${projectId}/defects/${q ? `?${q}` : ""}`;
    return this.get(path)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async create(
    workspaceSlug: string,
    projectId: string,
    data: Pick<IDefect, "name" | "task_id"> & Partial<Pick<IDefect, "priority" | "state_id" | "description_html">>
  ): Promise<IDefect> {
    return this.post(`/api/workspaces/${workspaceSlug}/projects/${projectId}/defects/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getDefect(workspaceSlug: string, projectId: string, defectId: string): Promise<IDefect> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/defects/${defectId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async update(workspaceSlug: string, projectId: string, defectId: string, data: Partial<IDefect>): Promise<IDefect> {
    return this.patch(`/api/workspaces/${workspaceSlug}/projects/${projectId}/defects/${defectId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async destroy(workspaceSlug: string, projectId: string, defectId: string): Promise<void> {
    return this.delete(`/api/workspaces/${workspaceSlug}/projects/${projectId}/defects/${defectId}/`)
      .then(() => undefined)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
