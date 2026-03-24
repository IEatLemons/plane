import path from "node:path";
import * as dotenv from "@dotenvx/dotenvx";
import { reactRouter } from "@react-router/dev/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function joinUrlPath(...parts: string[]): string {
  const cleaned = parts
    .filter(Boolean)
    .map((p) => p.replace(/(^\/+|\/+$)/g, ""))
    .filter(Boolean);
  return "/" + cleaned.join("/");
}

dotenv.config({ path: path.resolve(__dirname, ".env") });

// Expose only vars starting with VITE_
const viteEnv = Object.keys(process.env)
  .filter((k) => k.startsWith("VITE_"))
  .reduce<Record<string, string>>((a, k) => {
    a[k] = process.env[k] ?? "";
    return a;
  }, {});

const rawBasePath = joinUrlPath(process.env.VITE_ADMIN_BASE_PATH ?? "", "/") ?? "/";
// Vite `base` should end with a trailing slash, otherwise it may emit paths like "/god-modeassets/...".
const viteBasePath = rawBasePath === "/" ? "/" : `${rawBasePath}/`;

/** 开发时访问 /god-mode 无尾部斜杠时 302 到 /god-mode/，避免 React Router 提示页 */
function adminBasePathRedirectPlugin(baseWithSlash: string): Plugin {
  if (baseWithSlash === "/") {
    return { name: "admin-base-path-redirect-noop" };
  }
  const withoutTrailingSlash = baseWithSlash.replace(/\/+$/, "");
  return {
    name: "admin-base-path-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        const pathOnly = url.split("?")[0] ?? "";
        if (pathOnly === withoutTrailingSlash) {
          const qs = url.includes("?") ? url.slice(url.indexOf("?")) : "";
          res.writeHead(302, { Location: baseWithSlash + qs });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => ({
  base: viteBasePath,
  define: {
    "process.env": JSON.stringify(viteEnv),
  },
  build: {
    assetsInlineLimit: 0,
  },
  plugins: [
    adminBasePathRedirectPlugin(viteBasePath),
    reactRouter(),
    tsconfigPaths({ projects: [path.resolve(__dirname, "tsconfig.json")] }),
  ],
  resolve: {
    alias: {
      // Next.js compatibility shims used within admin
      "next/link": path.resolve(__dirname, "app/compat/next/link.tsx"),
      "next/navigation": path.resolve(__dirname, "app/compat/next/navigation.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
  },
  // No SSR-specific overrides needed; alias resolves to ESM build
}));
