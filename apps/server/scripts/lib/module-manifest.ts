import type { ModuleManifestEntry } from "./module-dependency-rules.js";

/**
 * Static module manifest for CI scripts that must not boot runtime config.
 * Keep in sync with `src/enabled-modules.ts` and each module's `requires`.
 */
export const SERVER_MODULE_MANIFEST = [
  {
    id: "rbac",
    kind: "infrastructure",
  },
  {
    id: "audit",
    kind: "infrastructure",
    requires: ["rbac"],
  },
  {
    id: "background-job",
    kind: "infrastructure",
    requires: ["rbac", "audit"],
  },
  {
    id: "error-log",
    kind: "infrastructure",
    requires: ["rbac"],
  },
  {
    id: "slow-query",
    kind: "infrastructure",
    requires: ["rbac", "background-job"],
  },
  {
    id: "notification",
    kind: "infrastructure",
    requires: ["rbac"],
  },
  {
    id: "user",
    kind: "infrastructure",
    requires: ["rbac", "audit", "platform"],
  },
  {
    id: "platform",
    kind: "infrastructure",
    requires: ["rbac", "audit", "background-job"],
  },
  {
    id: "notes",
    kind: "business",
    requires: ["rbac", "audit"],
  },
] as const satisfies readonly ModuleManifestEntry[];
