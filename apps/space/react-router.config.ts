import type { Config } from "@react-router/dev/config";

function joinUrlPath(...parts: string[]): string {
  const cleaned = parts
    .filter(Boolean)
    .map((p) => p.replace(/(^\/+|\/+$)/g, ""))
    .filter(Boolean);
  return "/" + cleaned.join("/");
}

const basePath = joinUrlPath(process.env.VITE_SPACE_BASE_PATH ?? "", "/") ?? "/";

export default {
  appDirectory: "app",
  basename: basePath,
  ssr: true,
} satisfies Config;
