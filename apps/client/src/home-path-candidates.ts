import {
  EXAMPLE_HOME_PATH_CANDIDATES,
  type HomePathCandidate,
} from "@be-water/client-kit";

/**
 * 登录后落地页候选（顺序即优先级）。
 *
 * `/dashboard`（`dashboard` 模块）排第一且**不带任何门控**：它是所有租户用户的
 * 默认首页，卡片才按模块开关/权限逐张过滤，所以这一项永远命中，后面的候选实际上
 * 只在移除 `dashboard` 模块时才会用到。
 *
 * 产品仓升级到 be-water 时：
 * 1. 想换默认首页就把业务首页插到 `/dashboard` 之前
 * 2. 每个带门控的候选必须带 `tenantModule`（与 manifest `tenantEntitlements[].key` 一致）
 * 3. 未启用的示例模块（notes / todos）从 `enabled-modules` 移除后，也从本列表去掉
 */
export const HOME_PATH_CANDIDATES: readonly HomePathCandidate[] = [
  { path: "/dashboard" },
  ...EXAMPLE_HOME_PATH_CANDIDATES,
];
