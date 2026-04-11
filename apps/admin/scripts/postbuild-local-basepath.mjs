/**
 * Post-build: optional HTML normalization when serving under VITE_ADMIN_BASE_PATH (e.g. /god-mode).
 * Vite `base` already encodes the path; this collapses accidental double slashes in emitted HTML.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(__dirname, "..", "build", "client");

if (!existsSync(clientDir)) {
  console.error("postbuild-local-basepath: build/client not found; run react-router build first.");
  process.exit(1);
}

const raw = process.env.VITE_ADMIN_BASE_PATH ?? "/god-mode";
const base = raw.replace(/\/+$/, "");

function patchFile(filePath) {
  if (!base || base === "/") return;
  const prefix = `${base}/`;
  let html = readFileSync(filePath, "utf8");
  const next = html.replaceAll(`${base}//`, prefix);
  if (next !== html) writeFileSync(filePath, next, "utf8");
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!name.endsWith(".html")) continue;
    patchFile(p);
  }
}

walk(clientDir);
