import { registerDependencyHealthJobs } from "./dependency-health-jobs.js";
import { errorLogRoutes } from "./error-log.routes.js";
import { ERROR_LOG_SERVER_I18N } from "./i18n.js";
import { registerJobFailureReporter } from "./job-failure-jobs.js";
import { registerPlatformErrorLogRoutes } from "./platform-error-log.routes.js";
import { registerProcessExceptionJobs } from "./process-exception-jobs.js";
import { registerErrorLogCleanupJobs } from "./scheduler-jobs.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const errorLogServerModule: ServerAppModule = {
  id: "error-log",
  version: "1.0.0",
  label: "Error Log",
  kind: "infrastructure",
  description: "服务端错误日志查询 API",
  requires: ["rbac", "background-job"],
  shared: {
    permissions: [
      { key: "error_logs.read", label: "查看错误日志", group: "系统监控" },
      { key: "error_logs.manage", label: "管理错误日志", group: "系统监控" },
    ],
  },
  server: {
    i18n: ERROR_LOG_SERVER_I18N,
    registerRoutes: async (app) => {
      await app.register(errorLogRoutes, { prefix: "/api/error-logs" });
      await app.register(
        async (platformApp) => {
          platformApp.addHook("onRequest", app.requirePlatformAdmin);
          await registerPlatformErrorLogRoutes(platformApp);
        },
        { prefix: "/api/platform" },
      );
    },
    registerJobs: (ctx) => {
      // 先挂订阅：dependency-health 带 run_on_start，startAll 里就会起跑
      registerJobFailureReporter(ctx);
      registerErrorLogCleanupJobs(ctx);
      registerProcessExceptionJobs(ctx);
      registerDependencyHealthJobs(ctx);
    },
  },
};
