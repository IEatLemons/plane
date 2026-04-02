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
  | "VITE_SESSION_RECORDER_KEY"
  | "VITE_GITHUB_STAR_URL"
  | "VITE_GITHUB_FORK_URL";

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
  /** Set in apps/web/.env or Docker `-e` / `runtime-env.js` — your repo for "Star on GitHub" (empty = hide or use fork). */
  VITE_GITHUB_STAR_URL: "",
  /** Optional second link when different from star URL (e.g. upstream vs your fork). */
  VITE_GITHUB_FORK_URL: "",
};

/** Vite injects `import.meta.env`; plain Node (e.g. apps/live) has neither — use `process.env` from `--env-file`. */
function buildTimeEnv(key: RuntimeEnvKey): string | undefined {
  const meta =
    typeof import.meta !== "undefined" &&
    import.meta !== null &&
    "env" in import.meta &&
    typeof (import.meta as ImportMeta & { env?: unknown }).env === "object"
      ? (import.meta as ImportMeta & { env: Record<string, string | boolean | undefined> }).env
      : undefined;
  const fromMeta = meta?.[key];
  if (fromMeta !== undefined && fromMeta !== null) {
    return String(fromMeta);
  }
  if (typeof process !== "undefined" && process.env[key] !== undefined) {
    return process.env[key];
  }
  return undefined;
}

const viteBuildEnv: Record<RuntimeEnvKey, string | undefined> = {
  VITE_API_BASE_URL: buildTimeEnv("VITE_API_BASE_URL"),
  VITE_API_BASE_PATH: buildTimeEnv("VITE_API_BASE_PATH"),
  VITE_ADMIN_BASE_URL: buildTimeEnv("VITE_ADMIN_BASE_URL"),
  VITE_ADMIN_BASE_PATH: buildTimeEnv("VITE_ADMIN_BASE_PATH"),
  VITE_SPACE_BASE_URL: buildTimeEnv("VITE_SPACE_BASE_URL"),
  VITE_SPACE_BASE_PATH: buildTimeEnv("VITE_SPACE_BASE_PATH"),
  VITE_LIVE_BASE_URL: buildTimeEnv("VITE_LIVE_BASE_URL"),
  VITE_LIVE_BASE_PATH: buildTimeEnv("VITE_LIVE_BASE_PATH"),
  VITE_WEB_BASE_URL: buildTimeEnv("VITE_WEB_BASE_URL"),
  VITE_WEB_BASE_PATH: buildTimeEnv("VITE_WEB_BASE_PATH"),
  VITE_WEBSITE_URL: buildTimeEnv("VITE_WEBSITE_URL"),
  VITE_SUPPORT_EMAIL: buildTimeEnv("VITE_SUPPORT_EMAIL"),
  VITE_ENABLE_SESSION_RECORDER: buildTimeEnv("VITE_ENABLE_SESSION_RECORDER"),
  VITE_SESSION_RECORDER_KEY: buildTimeEnv("VITE_SESSION_RECORDER_KEY"),
  VITE_GITHUB_STAR_URL: buildTimeEnv("VITE_GITHUB_STAR_URL"),
  VITE_GITHUB_FORK_URL: buildTimeEnv("VITE_GITHUB_FORK_URL"),
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

/** Repo for "Star on GitHub": explicit `VITE_GITHUB_STAR_URL`, else `VITE_GITHUB_FORK_URL`. */
export function getGithubStarUrl(): string {
  const star = readEnv("VITE_GITHUB_STAR_URL").trim();
  if (star) return star;
  return readEnv("VITE_GITHUB_FORK_URL").trim();
}

/** Optional fork URL for a second header link when it differs from the star target. */
export function getGithubForkUrl(): string {
  return readEnv("VITE_GITHUB_FORK_URL").trim();
}

/** `…/issues/new/choose` for the resolved GitHub repo; empty when no repo is configured. */
export function getGithubNewIssueUrl(): string {
  const base = getGithubStarUrl().replace(/\/$/, "");
  if (!base) return "";
  return `${base}/issues/new/choose`;
}
