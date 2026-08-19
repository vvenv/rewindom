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
    id: "slow-request",
    kind: "infrastructure",
    requires: ["rbac", "background-job"],
  },
  {
    id: "notification",
    kind: "infrastructure",
    requires: ["rbac"],
  },
  {
    id: "translation",
    kind: "infrastructure",
    requires: ["rbac"],
  },
  {
    id: "dashboard",
    kind: "infrastructure",
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
    // marketing：把「套餐」段的渲染器填进它的段注册表（marketing 不反向依赖）
    requires: ["rbac", "audit", "platform", "marketing"],
  },
  {
    id: "site-billing",
    kind: "business",
    // billing：只借它的支付通道抽象（`createCreemProvider`），两个领域各收各的钱
    requires: [
      "rbac",
      "audit",
      "platform",
      "marketing",
      "site-member",
      "billing",
    ],
  },
  // 外部模块（modules/*）的 manifest 条目由 `pnpm gen:external-modules` 自动注入
  {
    id: "bookmark",
    kind: "business",
    requires: ["rbac", "audit"],
  },
  {
    id: "events",
    kind: "business",
    // platform：读 tenant_modules 判断站点是否开通事件雷达
    // marketing：贡献官网段、模板页与 /events 公开路径
    requires: ["rbac", "audit", "platform", "marketing"],
  },
  {
    id: "note",
    kind: "business",
    requires: ["rbac", "audit"],
  },
  {
    id: "shop",
    kind: "business",
    requires: ["rbac", "audit", "marketing", "site-member"],
  },
  {
    id: "site-docs",
    kind: "business",
    requires: ["marketing", "rbac", "audit"],
  },
  {
    id: "site-form",
    kind: "business",
    requires: ["rbac", "audit", "marketing"],
  },
  {
    id: "todo",
    kind: "business",
    requires: ["rbac", "audit"],
  },
] as const satisfies readonly ModuleManifestEntry[];
