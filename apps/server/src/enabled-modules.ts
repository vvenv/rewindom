import { auditServerModule } from "@be-water/builtin/audit/server/index.js";
import { backgroundJobServerModule } from "@be-water/builtin/background-job/server/index.js";
import { billingServerModule } from "@be-water/builtin/billing/server/index.js";
import { dashboardServerModule } from "@be-water/builtin/dashboard/server/index.js";
import { errorLogServerModule } from "@be-water/builtin/error-log/server/index.js";
import { marketingServerModule } from "@be-water/builtin/marketing/server/index.js";
import { notificationServerModule } from "@be-water/builtin/notification/server/index.js";
import { platformServerModule } from "@be-water/builtin/platform/server/index.js";
import { rbacServerModule } from "@be-water/builtin/rbac/server/index.js";
import { siteBillingServerModule } from "@be-water/builtin/site-billing/server/index.js";
import { siteMemberServerModule } from "@be-water/builtin/site-member/server/index.js";
import { slowQueryServerModule } from "@be-water/builtin/slow-query/server/index.js";
import { userServerModule } from "@be-water/builtin/user/server/index.js";

import { EXTERNAL_SERVER_MODULES } from "./external-modules.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const ENABLED_SERVER_MODULES = [
  rbacServerModule,
  auditServerModule,
  backgroundJobServerModule,
  errorLogServerModule,
  slowQueryServerModule,
  notificationServerModule,
  dashboardServerModule,
  userServerModule,
  platformServerModule,
  marketingServerModule,
  siteMemberServerModule,
  billingServerModule,
  siteBillingServerModule,
  // 外部模块（modules/*）由 `pnpm gen:external-modules` 生成
  ...EXTERNAL_SERVER_MODULES,
] as const satisfies readonly ServerAppModule[];
