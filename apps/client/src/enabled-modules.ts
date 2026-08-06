import { auditClientModule } from "@be-water/modules/audit/client/module.js";
import { backgroundJobClientModule } from "@be-water/modules/background-job/client/module.js";
import { billingClientModule } from "@be-water/modules/billing/client/module.js";
import { dashboardClientModule } from "@be-water/modules/dashboard/client/module.js";
import { errorLogClientModule } from "@be-water/modules/error-log/client/module.js";
import { marketingClientModule } from "@be-water/modules/marketing/client/module.js";
import { notesClientModule } from "@be-water/modules/notes/client/module.js";
import { notificationClientModule } from "@be-water/modules/notification/client/module.js";
import { platformClientModule } from "@be-water/modules/platform/client/module.js";
import { rbacClientModule } from "@be-water/modules/rbac/client/module.js";
import { siteMemberClientModule } from "@be-water/modules/site-member/client/module.js";
import { slowQueryClientModule } from "@be-water/modules/slow-query/client/module.js";
import { todosClientModule } from "@be-water/modules/todos/client/module.js";
import { userClientModule } from "@be-water/modules/user/client/module.js";

import { appShellClientModule } from "@/shell/index";

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
  notesClientModule,
  todosClientModule,
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
] as const satisfies readonly ClientAppModule[];
