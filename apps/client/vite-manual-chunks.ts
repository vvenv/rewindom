/** Normalize Vite/Rollup module id for path checks (always forward slashes). */
export function normalizeModuleId(id: string): string {
  return id.replace(/\\/g, "/");
}

/**
 * True when id resolves under `/node_modules/{pkgPath...}/`.
 * Uses package folder boundaries so pnpm peer-dep store names
 * (e.g. `@types+react-dom@`, `react-dom@19.2.7`) are not matched.
 */
export function inNodeModules(id: string, ...pkgPath: string[]): boolean {
  const normalized = normalizeModuleId(id);
  return normalized.includes(`/node_modules/${pkgPath.join("/")}/`);
}

export function manualChunks(id: string): string | undefined {
  const normalized = normalizeModuleId(id);

  if (!normalized.includes("/node_modules/")) {
    if (normalized.includes("/packages/ui/src/")) return "ui-components";
    if (normalized.includes("/packages/client-shell/src/")) return "client-shell";
    if (normalized.includes("/packages/client-api/src/")) return "client-api";
    if (normalized.includes("/src/lib/")) return "lib";
    return undefined;
  }

  // Large or on-demand deps — keep out of the main vendor catch-all
  if (inNodeModules(id, "exceljs")) return "exceljs-vendor";
  if (inNodeModules(id, "recharts")) return "recharts-vendor";

  // React runtime (exact package paths only — never `id.includes("react-dom")`)
  if (inNodeModules(id, "@floating-ui", "react-dom")) return "react-dom";
  if (inNodeModules(id, "react-dom")) return "react-dom";
  if (inNodeModules(id, "scheduler")) return "react-dom";
  if (
    inNodeModules(id, "react-router") ||
    inNodeModules(id, "react-router-dom")
  ) {
    return "react-router";
  }
  if (inNodeModules(id, "react")) return "react-core";

  if (inNodeModules(id, "@tanstack")) return "tanstack-vendor";

  if (
    inNodeModules(id, "radix-ui") ||
    inNodeModules(id, "@radix-ui") ||
    inNodeModules(id, "@radix-ui", "react-icons")
  ) {
    return "radix-vendor";
  }
  if (
    inNodeModules(id, "@base-ui", "react") ||
    inNodeModules(id, "@base-ui", "utils")
  ) {
    return "base-ui-vendor";
  }
  if (inNodeModules(id, "lucide-react")) return "icons-vendor";

  if (
    inNodeModules(id, "clsx") ||
    inNodeModules(id, "tailwind-merge") ||
    inNodeModules(id, "class-variance-authority")
  ) {
    return "utils-vendor";
  }
  if (inNodeModules(id, "date-fns") || inNodeModules(id, "react-day-picker")) {
    return "date-vendor";
  }
  if (inNodeModules(id, "sonner")) return "toast-vendor";

  return "vendor";
}
