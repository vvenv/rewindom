import { auditClientModule } from "@be-water/modules/audit/client/module.js";
import { backgroundJobClientModule } from "@be-water/modules/background-job/client/module.js";
import { errorLogClientModule } from "@be-water/modules/error-log/client/module.js";
import { notesClientModule } from "@be-water/modules/notes/client/module.js";
import { notificationClientModule } from "@be-water/modules/notification/client/module.js";
import { platformClientModule } from "@be-water/modules/platform/client/module.js";
import { rbacClientModule } from "@be-water/modules/rbac/client/module.js";
import { slowQueryClientModule } from "@be-water/modules/slow-query/client/module.js";
import { todosClientModule } from "@be-water/modules/todos/client/module.js";
import { userClientModule } from "@be-water/modules/user/client/module.js";


import { appShellClientModule } from "@/shell/index";

import type { ClientAppModule } from "@be-water/client-kit";

/**
 * 模块顺序决定侧栏 section 顺序与移动端 tab 顺序（见 collect-modules.ts）。
 * 新增业务模块在此追加。
 */
export const ENABLED_CLIENT_MODULES = [
  appShellClientModule,
  rbacClientModule,
  backgroundJobClientModule,
  userClientModule,
  platformClientModule,
  auditClientModule,
  errorLogClientModule,
  slowQueryClientModule,
  notesClientModule,
  notificationClientModule,
  todosClientModule,
] as const satisfies readonly ClientAppModule[];
