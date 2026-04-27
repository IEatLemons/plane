import path from "node:path";
import * as dotenv from "@dotenvx/dotenvx";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { planeRuntimeEnvPlugin } from "./vite-runtime-env-plugin";

dotenv.config({ path: path.resolve(__dirname, ".env") });

/** Repo root (apps/web -> ../..). */
const workspaceRoot = path.resolve(__dirname, "../..");

const rollupMaxParallelFileOps = (() => {
  const raw = process.env.ROLLUP_MAX_PARALLEL_FILE_OPS?.trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
})();

const isCI = process.env.CI === "1" || process.env.CI === "true";

export default defineConfig(() => ({
  build: {
    assetsInlineLimit: 0,
    // Gzip size reporting is extra work and RSS during the Rollup build; skip in CI/Docker.
    reportCompressedSize: !isCI,
    rollupOptions: {
      // Lowers peak RSS during chunk rendering; set ROLLUP_MAX_PARALLEL_FILE_OPS in Docker/CI if builds OOM.
      ...(rollupMaxParallelFileOps !== undefined ? { maxParallelFileOps: rollupMaxParallelFileOps } : {}),
    },
  },
  plugins: [
    reactRouter(),
    tsconfigPaths({ projects: [path.resolve(__dirname, "tsconfig.json")] }),
    // Must run after react-router so the generated index.html still gets the script.
    planeRuntimeEnvPlugin(),
  ],
  resolve: {
    alias: {
      // Next.js compatibility shims used within web
      "next/link": path.resolve(__dirname, "app/compat/next/link.tsx"),
      "next/navigation": path.resolve(__dirname, "app/compat/next/navigation.ts"),
      "next/script": path.resolve(__dirname, "app/compat/next/script.tsx"),
      // Source aliases: these packages export `./dist/*` only. Dev works without a prior `build`
      // (avoids "Failed to load .../packages/utils/dist/index.js").
      "@plane/utils": path.resolve(workspaceRoot, "packages/utils/src/index.ts"),
      "@plane/constants": path.resolve(workspaceRoot, "packages/constants/src/index.ts"),
      "@plane/types": path.resolve(workspaceRoot, "packages/types/src/index.ts"),
    },
    dedupe: ["react", "react-dom", "@headlessui/react"],
  },
  server: {
    host: "127.0.0.1",
  },
  // No SSR-specific overrides needed; alias resolves to ESM build
}));
