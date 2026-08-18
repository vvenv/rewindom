import { registerPlatformSlowRequestRoutes } from "./platform-slow-request.routes.js";
import { registerSlowRequestCleanupJobs } from "./scheduler-jobs.js";
import { slowRequestLogRoutes } from "./slow-request-log.routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const slowRequestServerModule: ServerAppModule = {
  id: "slow-request",
  version: "1.0.0",
  label: "Slow Request Log",
  kind: "infrastructure",
  description: "慢请求日志 API 与定时清理",
  requires: ["rbac", "background-job"],
  server: {
    registerRoutes: async (app) => {
      await app.register(slowRequestLogRoutes, {
        prefix: "/api/slow-request-logs",
      });
      await app.register(
        async (platformApp) => {
          platformApp.addHook("onRequest", app.requirePlatformAdmin);
          await registerPlatformSlowRequestRoutes(platformApp);
        },
        { prefix: "/api/platform" },
      );
    },
    registerJobs: (ctx) => {
      registerSlowRequestCleanupJobs(ctx);
    },
  },
};
