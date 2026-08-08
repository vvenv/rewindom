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
    id: "marketing",
    kind: "infrastructure",
    // platform：官网 logo 默认继承租户品牌资产（未上传时才回落到手填 URL）
    requires: ["rbac", "audit", "platform"],
  },
  {
    id: "site-member",
    kind: "infrastructure",
    // platform：注册前需要确认站点已开通会员 entitlement
    // marketing：前端把会员入口 / 门控组件填进站点前台的 slot（方向 site-member → marketing）
    requires: ["rbac", "audit", "platform", "marketing"],
  },
  {
    id: "billing",
    kind: "business",
    requires: ["rbac", "audit", "platform"],
  },
  // 外部模块（modules/*）的 manifest 条目由 `pnpm gen:external-modules` 自动注入
  {
    id: "bookmark",
    kind: "business",
    requires: ["rbac", "audit"],
  },
  {
    id: "note",
    kind: "business",
    requires: ["rbac", "audit"],
  },
  {
    id: "todo",
    kind: "business",
    requires: ["rbac", "audit"],
  },
] as const satisfies readonly ModuleManifestEntry[];
