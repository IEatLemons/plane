/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/// <reference types="vite/client" />

/**
 * Runtime overrides (e.g. Docker `docker run -e`): generated `runtime-env.js` sets this before app bundles load.
 * Falls back to Vite `import.meta.env` (local `.env`), then to local defaults matching apps/web/.env.example.
 */
declare global {
  interface Window {
    __PLANE_RUNTIME_CONFIG__?: Partial<Record<RuntimeEnvKey, string>>;
  }
}

type RuntimeEnvKey =
  | "VITE_API_BASE_URL"
  | "VITE_API_BASE_PATH"
  | "VITE_ADMIN_BASE_URL"
  | "VITE_ADMIN_BASE_PATH"
  | "VITE_SPACE_BASE_URL"
  | "VITE_SPACE_BASE_PATH"
  | "VITE_LIVE_BASE_URL"
  | "VITE_LIVE_BASE_PATH"
  | "VITE_WEB_BASE_URL"
  | "VITE_WEB_BASE_PATH"
  | "VITE_WEBSITE_URL"
  | "VITE_SUPPORT_EMAIL"
  | "VITE_ENABLE_SESSION_RECORDER"
  | "VITE_SESSION_RECORDER_KEY";

/** Defaults when neither runtime nor build-time env is set (local dev / Docker without overrides). */
const LOCAL_DEFAULTS: Record<RuntimeEnvKey, string> = {
  VITE_API_BASE_URL: "http://localhost:8000",
  VITE_API_BASE_PATH: "/api",
  VITE_ADMIN_BASE_URL: "http://localhost:3001",
  VITE_ADMIN_BASE_PATH: "/god-mode",
  VITE_SPACE_BASE_URL: "http://localhost:3002",
  VITE_SPACE_BASE_PATH: "/spaces",
  VITE_LIVE_BASE_URL: "http://localhost:3100",
  VITE_LIVE_BASE_PATH: "/live",
  VITE_WEB_BASE_URL: "http://localhost:3000",
  VITE_WEB_BASE_PATH: "",
  VITE_WEBSITE_URL: "https://plane.so",
  VITE_SUPPORT_EMAIL: "support@plane.so",
  VITE_ENABLE_SESSION_RECORDER: "0",
  VITE_SESSION_RECORDER_KEY: "",
};

const viteBuildEnv: Record<RuntimeEnvKey, string | undefined> = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_API_BASE_PATH: import.meta.env.VITE_API_BASE_PATH,
  VITE_ADMIN_BASE_URL: import.meta.env.VITE_ADMIN_BASE_URL,
  VITE_ADMIN_BASE_PATH: import.meta.env.VITE_ADMIN_BASE_PATH,
  VITE_SPACE_BASE_URL: import.meta.env.VITE_SPACE_BASE_URL,
  VITE_SPACE_BASE_PATH: import.meta.env.VITE_SPACE_BASE_PATH,
  VITE_LIVE_BASE_URL: import.meta.env.VITE_LIVE_BASE_URL,
  VITE_LIVE_BASE_PATH: import.meta.env.VITE_LIVE_BASE_PATH,
  VITE_WEB_BASE_URL: import.meta.env.VITE_WEB_BASE_URL,
  VITE_WEB_BASE_PATH: import.meta.env.VITE_WEB_BASE_PATH,
  VITE_WEBSITE_URL: import.meta.env.VITE_WEBSITE_URL,
  VITE_SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL,
  VITE_ENABLE_SESSION_RECORDER: import.meta.env.VITE_ENABLE_SESSION_RECORDER,
  VITE_SESSION_RECORDER_KEY: import.meta.env.VITE_SESSION_RECORDER_KEY,
};

function readEnv(key: RuntimeEnvKey): string {
  if (typeof window !== "undefined" && window.__PLANE_RUNTIME_CONFIG__?.[key] !== undefined) {
    return String(window.__PLANE_RUNTIME_CONFIG__[key]);
  }
  const built = viteBuildEnv[key];
  if (built !== undefined && built !== null && built !== "") {
    return String(built);
  }
  if (built === "") {
    return "";
  }
  return LOCAL_DEFAULTS[key];
}

export const API_BASE_URL = readEnv("VITE_API_BASE_URL");
export const API_BASE_PATH = readEnv("VITE_API_BASE_PATH");
export const API_URL = encodeURI(`${API_BASE_URL}${API_BASE_PATH}`);
// God Mode Admin App Base Url
export const ADMIN_BASE_URL = readEnv("VITE_ADMIN_BASE_URL");
export const ADMIN_BASE_PATH = readEnv("VITE_ADMIN_BASE_PATH");
export const GOD_MODE_URL = encodeURI(`${ADMIN_BASE_URL}${ADMIN_BASE_PATH}`);
// Publish App Base Url
export const SPACE_BASE_URL = readEnv("VITE_SPACE_BASE_URL");
export const SPACE_BASE_PATH = readEnv("VITE_SPACE_BASE_PATH");
export const SITES_URL = encodeURI(`${SPACE_BASE_URL}${SPACE_BASE_PATH}`);
// Live App Base Url
export const LIVE_BASE_URL = readEnv("VITE_LIVE_BASE_URL");
export const LIVE_BASE_PATH = readEnv("VITE_LIVE_BASE_PATH");
export const LIVE_URL = encodeURI(`${LIVE_BASE_URL}${LIVE_BASE_PATH}`);
// Web App Base Url
export const WEB_BASE_URL = readEnv("VITE_WEB_BASE_URL");
export const WEB_BASE_PATH = readEnv("VITE_WEB_BASE_PATH");
export const WEB_URL = encodeURI(`${WEB_BASE_URL}${WEB_BASE_PATH}`);
// plane website url
export const WEBSITE_URL = readEnv("VITE_WEBSITE_URL");
// support email
export const SUPPORT_EMAIL = readEnv("VITE_SUPPORT_EMAIL");
// marketing links
export const MARKETING_PRICING_PAGE_LINK = "https://plane.so/pricing";
export const MARKETING_CONTACT_US_PAGE_LINK = "https://plane.so/contact";
export const MARKETING_PLANE_ONE_PAGE_LINK = "https://plane.so/one";

/** Session recorder toggle (0/1); respects runtime config. */
export function getEnableSessionRecorder(): number {
  return parseInt(readEnv("VITE_ENABLE_SESSION_RECORDER"), 10) || 0;
}

export function getSessionRecorderKey(): string {
  return readEnv("VITE_SESSION_RECORDER_KEY");
}
