import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const RUNTIME_STUB = "window.__PLANE_RUNTIME_CONFIG__={};";

/**
 * Injects `/runtime-env.js` before app bundles (Docker entrypoint overwrites with real env).
 * Dev server serves a no-op stub; production build writes `build/client/runtime-env.js`.
 */
export function planeRuntimeEnvPlugin(): Plugin {
  return {
    name: "plane-runtime-env",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] === "/runtime-env.js") {
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.end(RUNTIME_STUB);
          return;
        }
        next();
      });
    },
    transformIndexHtml(html) {
      // React Router generates the final HTML after other plugins; inject by string replace.
      const injected = html.replace("<head>", '<head><script src="/runtime-env.js"></script>');
      return injected;
    },
    writeBundle(options) {
      const dir = options.dir;
      if (!dir) return;
      const file = path.join(dir, "runtime-env.js");
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, RUNTIME_STUB, "utf8");
    },
  };
}
