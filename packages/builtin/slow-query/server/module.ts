import { registerPlatformSlowQueryRoutes } from "./platform-slow-query.routes.js";
import { registerSlowQueryCleanupJobs } from "./scheduler-jobs.js";
import { slowQueryLogRoutes } from "./slow-query-log.routes.js";


import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const slowQueryServerModule: ServerAppModule = {
  id: "slow-query",
  version: "1.0.0",
  label: "Slow Query Log",
  kind: "infrastructure",
  description: "慢查询日志 API 与定时清理",
  requires: ["rbac", "background-job"],
  server: {
    registerRoutes: async (app) => {
      await app.register(slowQueryLogRoutes, { prefix: "/api/slow-query-logs" });
      await app.register(
        async (platformApp) => {
          platformApp.addHook("onRequest", app.requirePlatformAdmin);
          await registerPlatformSlowQueryRoutes(platformApp);
        },
        { prefix: "/api/platform" },
      );
    },
    registerJobs: (ctx) => {
      registerSlowQueryCleanupJobs(ctx);
    },
  },
};
