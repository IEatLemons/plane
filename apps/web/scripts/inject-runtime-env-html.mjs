/**
 * Post-build: ensure every HTML under build/client references /runtime-env.js in <head>.
 * Vite's planeRuntimeEnvPlugin already transforms index; this covers any extra HTML emitted by the framework.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(__dirname, "..", "build", "client");

if (!existsSync(clientDir)) {
  console.error("inject-runtime-env-html: missing build/client; react-router build must run first.");
  process.exit(1);
}

function injectHtmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      injectHtmlFiles(p);
      continue;
    }
    if (!name.endsWith(".html")) continue;
    let html = readFileSync(p, "utf8");
    if (html.includes("runtime-env.js")) continue;
    const next = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}<script src="/runtime-env.js"></script>`);
    if (next === html) {
      console.warn(`inject-runtime-env-html: could not find <head> in ${p}`);
      continue;
    }
    writeFileSync(p, next, "utf8");
  }
}

injectHtmlFiles(clientDir);
