import {
  collectModulePermissions,
  type MergedPermissionCatalog,
} from "./collect-module-permissions.js";

import type { ServerAppModule } from "./module-contract.js";

let enabledModules: readonly ServerAppModule[] = [];
let cachedCatalog: MergedPermissionCatalog | undefined;

/**
 * 由宿主 app 在启动时注入已启用模块列表（见 `apps/server/src/server-assembly.ts`）。
 *
 * 权限目录是所有已启用模块 `shared.permissions` 的并集——`module-rbac` 需要它来
 * 校验权限 key 是否存在。模块**不得**反向 import 宿主的 `enabled-modules.ts`
 * （方向错误，且在包布局变动时会断），因此沿用与 `configureServerTenantCatalog`
 * 相同的注入模式。
 */
export function configureServerPermissionCatalog(
  modules: readonly ServerAppModule[],
): void {
  enabledModules = modules;
  cachedCatalog = undefined;
}

export function getServerPermissionCatalog(): MergedPermissionCatalog {
  cachedCatalog ??= collectModulePermissions(enabledModules);
  return cachedCatalog;
}
