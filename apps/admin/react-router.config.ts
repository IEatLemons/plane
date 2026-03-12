import type { Config } from "@react-router/dev/config";

function joinUrlPath(...parts: string[]): string {
  const cleaned = parts
    .filter(Boolean)
    .map((p) => p.replace(/(^\/+|\/+$)/g, ""))
    .filter(Boolean);
  return "/" + cleaned.join("/");
}

const basePath = joinUrlPath(process.env.VITE_ADMIN_BASE_PATH ?? "", "/") ?? "/";

export default {
  appDirectory: "app",
  basename: basePath,
  // Admin runs as a client-side app; build a static client bundle only
  ssr: false,
} satisfies Config;
