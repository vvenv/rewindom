import { recordTrafficSample } from "@rewindom/builtin/ip-access/server/traffic-stats.service.js";
import { createTenantModulePreHandler } from "@rewindom/builtin/platform/server/guards/tenant-module-guard.js";
import { SlowRequestService } from "@rewindom/builtin/slow-request/server/slow-request.service.js";
import { setErrorLogWriter } from "@rewindom/server-kernel/middleware/error-handler.middleware.js";
import { addRequestTimingRecorder } from "@rewindom/server-kernel/middleware/request-timing.middleware.js";
import { configureServerPermissionCatalog } from "@rewindom/server-kernel/runtime/permission-catalog.js";
import { setTenantModulePreHandlerFactory } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";
import { configureServerTenantCatalog } from "@rewindom/server-kernel/runtime/tenant-catalog.js";

import { ENABLED_SERVER_MODULES } from "./enabled-modules.js";

configureServerTenantCatalog(ENABLED_SERVER_MODULES);
configureServerPermissionCatalog(ENABLED_SERVER_MODULES);
setTenantModulePreHandlerFactory(createTenantModulePreHandler);
setErrorLogWriter(async (error, context) => {
  const { ErrorService } = await import("@rewindom/builtin/error-log/server/error.service.js");
  await ErrorService.logError(error, context);
});
// 「一次请求跑完了」有两个订阅者：慢请求落库、访问来源计数。
// 两者都不能让响应失败——内核已经逐个 try/catch。
addRequestTimingRecorder((sample) => {
  SlowRequestService.enqueue(sample);
});
addRequestTimingRecorder((sample) => {
  recordTrafficSample(sample);
});
