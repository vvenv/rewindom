import { auditServerModule } from "@be-water/modules/audit/server/index.js";
import { backgroundJobServerModule } from "@be-water/modules/background-job/server/index.js";
import { billingServerModule } from "@be-water/modules/billing/server/index.js";
import { errorLogServerModule } from "@be-water/modules/error-log/server/index.js";
import { marketingServerModule } from "@be-water/modules/marketing/server/index.js";
import { notesServerModule } from "@be-water/modules/notes/server/index.js";
import { notificationServerModule } from "@be-water/modules/notification/server/index.js";
import { platformServerModule } from "@be-water/modules/platform/server/index.js";
import { rbacServerModule } from "@be-water/modules/rbac/server/index.js";
import { siteMemberServerModule } from "@be-water/modules/site-member/server/index.js";
import { slowQueryServerModule } from "@be-water/modules/slow-query/server/index.js";
import { todosServerModule } from "@be-water/modules/todos/server/index.js";
import { userServerModule } from "@be-water/modules/user/server/index.js";

import { EXTERNAL_SERVER_MODULES } from "./external-modules.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const ENABLED_SERVER_MODULES = [
  rbacServerModule,
  auditServerModule,
  backgroundJobServerModule,
  errorLogServerModule,
  slowQueryServerModule,
  notificationServerModule,
  userServerModule,
  platformServerModule,
  marketingServerModule,
  siteMemberServerModule,
  notesServerModule,
  todosServerModule,
  billingServerModule,
  // 外部模块（packages/external-modules/*）由 `pnpm gen:external-modules` 生成
  ...EXTERNAL_SERVER_MODULES,
] as const satisfies readonly ServerAppModule[];
