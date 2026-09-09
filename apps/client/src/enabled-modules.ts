import { auditClientModule } from "@rewindom/builtin/audit/client/module.js";
import { backgroundJobClientModule } from "@rewindom/builtin/background-job/client/module.js";
import { billingClientModule } from "@rewindom/builtin/billing/client/module.js";
import { dashboardClientModule } from "@rewindom/builtin/dashboard/client/module.js";
import { errorLogClientModule } from "@rewindom/builtin/error-log/client/module.js";
import { ipAccessClientModule } from "@rewindom/builtin/ip-access/client/module.js";
import { mailerClientModule } from "@rewindom/builtin/mailer/client/module.js";
import { marketingClientModule } from "@rewindom/builtin/marketing/client/module.js";
import { notificationClientModule } from "@rewindom/builtin/notification/client/module.js";
import { platformClientModule } from "@rewindom/builtin/platform/client/module.js";
import { rbacClientModule } from "@rewindom/builtin/rbac/client/module.js";
import { siteBillingClientModule } from "@rewindom/builtin/site-billing/client/module.js";
import { siteMemberClientModule } from "@rewindom/builtin/site-member/client/module.js";
import { slowQueryClientModule } from "@rewindom/builtin/slow-query/client/module.js";
import { slowRequestClientModule } from "@rewindom/builtin/slow-request/client/module.js";
import { translationClientModule } from "@rewindom/builtin/translation/client/module.js";
import { userClientModule } from "@rewindom/builtin/user/client/module.js";

import { appShellClientModule } from "@/shell/index";

import { EXTERNAL_CLIENT_MODULES } from "./external-modules.js";

import type { ClientAppModule } from "@rewindom/client-kit";

/**
 * 内置模块注册顺序仍决定**同一分组内** items 的先后（如系统管理：用户 → 角色 → 账单）。
 * **分组之间**的顺序由各 `AppNavSection.order` 钉住（见 `APP_NAV_SECTION_ORDER`），
 * 因为外部模块由 `gen:external-modules` 按目录名字母序汇入，不能靠本数组排侧栏。
 *
 * 租户侧栏心流：
 * 1. 主区：概览 → 站点 → 受众 → 商店 → 事件 → 内容 → 示例
 * 2. 沉底：系统管理（用户 → 角色 → 账单 → AI 配置 → 访问控制）→ 系统监控（审计 → 错误）
 */
export const ENABLED_CLIENT_MODULES = [
  appShellClientModule,
  dashboardClientModule,
  marketingClientModule,
  siteMemberClientModule,
  siteBillingClientModule,
  notificationClientModule,
  backgroundJobClientModule,
  // 沉底：先注册「系统管理」再「系统监控」，组内顺序即下列模块顺序
  // 系统管理：用户 → 角色 → 订阅 → AI 配置
  userClientModule,
  rbacClientModule,
  billingClientModule,
  platformClientModule,
  mailerClientModule,
  ipAccessClientModule,
  // 无导航项，只往 platform 的 /app/settings 追加一张翻译设置面板
  translationClientModule,
  auditClientModule,
  errorLogClientModule,
  slowQueryClientModule,
  slowRequestClientModule,
  // 外部模块（modules/*）由 `pnpm gen:external-modules` 生成
  ...EXTERNAL_CLIENT_MODULES,
] as const satisfies readonly ClientAppModule[];
