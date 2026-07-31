import { ERROR_LOG_SERVER_I18N } from "./i18n.js";
import { errorLogRoutes } from "./error-log.routes.js";
import { registerPlatformErrorLogRoutes } from "./platform-error-log.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const errorLogServerModule: ServerAppModule = {
  id: "error-log",
  version: "1.0.0",
  label: "Error Log",
  kind: "infrastructure",
  description: "服务端错误日志查询 API",
  requires: ["rbac"],
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
  },
};
