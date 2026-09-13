import { auditLogRoutes } from "./audit-log.routes.js";
import { AuditService, type AuditLogInput } from "./audit.service.js";
import { registerPlatformAuditRoutes } from "./platform-audit.routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const auditServerModule: ServerAppModule = {
  id: "audit",
  version: "1.0.0",
  label: "Audit Log",
  kind: "infrastructure",
  description: "写操作审计日志与租户侧审计查询 API",
  requires: ["rbac"],
  shared: {
    permissions: [
      { key: "audit_logs.read", label: "查看审计日志", group: "系统监控" },
    ],
  },
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
      const outbox = ctx.registry.getOutboxProvider();

      // 重投用的是同一条写入路径：投递箱只负责「再喊一次」，不另写一份落库逻辑。
      outbox?.onMessage("audit.log", async (payload) => {
        await AuditService.log(payload as unknown as AuditLogInput);
      });

      ctx.events.on("audit.log", async (payload) => {
        try {
          // 内核事件契约刻意用 string 表达 action/scope（内核不依赖 audit 枚举），
          // 收敛为本模块枚举类型的动作发生在此订阅边界。
          await AuditService.log(payload as AuditLogInput);
        } catch (err) {
          ctx.log.warn({ err }, "[audit] event handler failed");

          /*
           * 审计是「所有写操作都必须留痕」的硬规则，而 EventBus 对 handler 抛错
           * 的处理是吞掉——一次数据库抖动就能让那条记录永久消失，只剩上面这行
           * warn。交给投递箱退避重试；没装 outbox 模块时维持旧行为（就是丢）。
           */
          if (!outbox) {
            return;
          }
          try {
            await outbox.enqueue({
              topic: "audit.log",
              payload: payload as never,
              tenant_id: null,
              last_error: err instanceof Error ? err.message : String(err),
            });
          } catch (enqueueErr) {
            // 连投递箱都写不进去，多半是同一个库出了问题，只能留证据
            ctx.log.error(
              { err: enqueueErr },
              "[audit] 转投递箱失败，该条审计已丢失",
            );
          }
        }
      });
    },
  },
};
