import { auditClientModule } from "@be-water/builtin/audit/client/module.js";
import { backgroundJobClientModule } from "@be-water/builtin/background-job/client/module.js";
import { billingClientModule } from "@be-water/builtin/billing/client/module.js";
import { dashboardClientModule } from "@be-water/builtin/dashboard/client/module.js";
import { errorLogClientModule } from "@be-water/builtin/error-log/client/module.js";
import { marketingClientModule } from "@be-water/builtin/marketing/client/module.js";
import { notificationClientModule } from "@be-water/builtin/notification/client/module.js";
import { platformClientModule } from "@be-water/builtin/platform/client/module.js";
import { rbacClientModule } from "@be-water/builtin/rbac/client/module.js";
import { siteMemberClientModule } from "@be-water/builtin/site-member/client/module.js";
import { slowQueryClientModule } from "@be-water/builtin/slow-query/client/module.js";
import { userClientModule } from "@be-water/builtin/user/client/module.js";

import { appShellClientModule } from "@/shell/index";

import { EXTERNAL_CLIENT_MODULES } from "./external-modules.js";

import type { ClientAppModule } from "@be-water/client-kit";

/**
 * 模块顺序决定侧栏 section 顺序与组内 items 顺序（见 collect-modules.ts）。
 *
 * 租户侧栏心流约定：
 * 1. 主区：概览 → 业务（示例等）
 * 2. 沉底：系统管理（用户 → 角色 → 订阅）→ 系统监控（审计 → 错误）
 *
 * 新增业务模块插在 dashboard 之后、沉底管理类之前。
 */
export const ENABLED_CLIENT_MODULES = [
  appShellClientModule,
  dashboardClientModule,
  marketingClientModule,
  siteMemberClientModule,
  notificationClientModule,
  backgroundJobClientModule,
  platformClientModule,
  // 沉底：先注册「系统管理」再「系统监控」，组内顺序即下列模块顺序
  userClientModule,
  rbacClientModule,
  billingClientModule,
  auditClientModule,
  errorLogClientModule,
  slowQueryClientModule,
  // 外部模块（modules/*）由 `pnpm gen:external-modules` 生成
  ...EXTERNAL_CLIENT_MODULES,
] as const satisfies readonly ClientAppModule[];
