import { createTenantModulePreHandler } from "@be-water/modules/platform/server/guards/tenant-module-guard.js";
import { setErrorLogWriter } from "@be-water/server-kernel/middleware/error-handler.middleware.js";
import { configureServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";
import { setTenantModulePreHandlerFactory } from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";
import { configureServerTenantCatalog } from "@be-water/server-kernel/runtime/tenant-catalog.js";

import { ENABLED_SERVER_MODULES } from "./enabled-modules.js";

configureServerTenantCatalog(ENABLED_SERVER_MODULES);
configureServerPermissionCatalog(ENABLED_SERVER_MODULES);
setTenantModulePreHandlerFactory(createTenantModulePreHandler);
setErrorLogWriter(async (error, context) => {
  const { ErrorService } = await import("@be-water/modules/error-log/server/error.service.js");
  await ErrorService.logError(error, context);
});
