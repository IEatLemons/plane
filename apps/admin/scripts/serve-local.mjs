/**
 * Serve `build/client` locally after production build (dependency: `serve`).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const pkgRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "..");
const staticDir = path.join(pkgRoot, "build", "client");
const port = process.env.PORT ?? "3001";

const child = spawn("npx", ["serve", "-s", staticDir, "-l", port], {
  cwd: pkgRoot,
  stdio: "inherit",
  shell: true,
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});
