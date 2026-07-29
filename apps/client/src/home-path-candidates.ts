import {
  EXAMPLE_HOME_PATH_CANDIDATES,
  type HomePathCandidate,
} from "@be-water/client-kit";

/**
 * 登录后落地页候选（顺序即优先级）。
 *
 * 产品仓升级到 be-water 时：
 * 1. 把业务首页插在 `EXAMPLE_HOME_PATH_CANDIDATES` 之前
 * 2. 每个候选必须带 `tenantModule`（与 manifest `tenantEntitlements[].key` 一致）
 * 3. 未启用的示例模块（notes / todos）从 `enabled-modules` 移除后，也从本列表去掉
 */
export const HOME_PATH_CANDIDATES: readonly HomePathCandidate[] =
  EXAMPLE_HOME_PATH_CANDIDATES;
