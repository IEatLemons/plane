import path from "node:path";
import * as dotenv from "@dotenvx/dotenvx";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { planeRuntimeEnvPlugin } from "./vite-runtime-env-plugin";

dotenv.config({ path: path.resolve(__dirname, ".env") });

/** Repo root (apps/web -> ../..). */
const workspaceRoot = path.resolve(__dirname, "../..");

export default defineConfig(() => ({
  build: {
    assetsInlineLimit: 0,
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
