import { auditLogRoutes } from "./audit-log.routes.js";
import { AuditService, type AuditLogInput } from "./audit.service.js";
import { registerPlatformAuditRoutes } from "./platform-audit.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const auditServerModule: ServerAppModule = {
  id: "audit",
  version: "1.0.0",
  label: "Audit Log",
  kind: "infrastructure",
  description: "写操作审计日志与租户侧审计查询 API",
  requires: ["rbac"],
  server: {
    registerRoutes: async (app) => {
      await app.register(auditLogRoutes, { prefix: "/api/audit-logs" });
      await app.register(
        async (platformApp) => {
          platformApp.addHook("onRequest", app.requirePlatformAdmin);
          await registerPlatformAuditRoutes(platformApp);
        },
        { prefix: "/api/platform" },
      );
    },
    onBoot: async (ctx) => {
      ctx.events.on("audit.log", async (payload) => {
        try {
          // 内核事件契约刻意用 string 表达 action/scope（内核不依赖 audit 枚举），
          // 收敛为本模块枚举类型的动作发生在此订阅边界。
          await AuditService.log(payload as AuditLogInput);
        } catch (err) {
          ctx.log.warn({ err }, "[audit] event handler failed");
        }
      });
    },
  },
};
