import { auditServerModule } from "@rewindom/builtin/audit/server/index.js";
import { backgroundJobServerModule } from "@rewindom/builtin/background-job/server/index.js";
import { billingServerModule } from "@rewindom/builtin/billing/server/index.js";
import { dashboardServerModule } from "@rewindom/builtin/dashboard/server/index.js";
import { errorLogServerModule } from "@rewindom/builtin/error-log/server/index.js";
import { marketingServerModule } from "@rewindom/builtin/marketing/server/index.js";
import { notificationServerModule } from "@rewindom/builtin/notification/server/index.js";
import { platformServerModule } from "@rewindom/builtin/platform/server/index.js";
import { rbacServerModule } from "@rewindom/builtin/rbac/server/index.js";
import { siteBillingServerModule } from "@rewindom/builtin/site-billing/server/index.js";
import { siteMemberServerModule } from "@rewindom/builtin/site-member/server/index.js";
import { slowQueryServerModule } from "@rewindom/builtin/slow-query/server/index.js";
import { userServerModule } from "@rewindom/builtin/user/server/index.js";

import { EXTERNAL_SERVER_MODULES } from "./external-modules.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

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
