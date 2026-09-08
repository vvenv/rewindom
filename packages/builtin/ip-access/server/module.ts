import { registerTenantGatedRoutes } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";

import { IP_ACCESS_ENTITLEMENT } from "../shared/index.js";

import {
  clearAbuseCounter,
  reportAbuse,
} from "./abuse-report.service.js";
import { IP_ACCESS_SERVER_I18N } from "./i18n.js";
import { subscribeIpAccessInvalidation } from "./ip-access.cache.js";
import { ipAccessMiddleware } from "./ip-access.middleware.js";
import { ipAccessRoutes } from "./ip-access.routes.js";
import { scheduleNginxExport } from "./nginx-export.js";
import { registerPlatformIpAccessRoutes } from "./platform-ip-access.routes.js";
import { registerIpAccessJobs } from "./scheduler-jobs.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const ipAccessServerModule: ServerAppModule = {
  id: "ip-access",
  version: "1.0.0",
  label: "IP Access",
  kind: "infrastructure",
  description: "IP 封禁名单（平台全局 + 租户两级），应用层判定 + 边缘层导出",
  requires: ["rbac", "audit", "background-job"],
  tenantEntitlements: [IP_ACCESS_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "ip_access.read",
        label: "查看访问规则",
        group: "访问控制",
        description: "查看 IP 规则列表与命中统计",
      },
      {
        key: "ip_access.write",
        label: "管理访问规则",
        group: "访问控制",
        description: "新增、编辑、删除 IP 规则",
      },
    ],
    auditActions: [
      { action: "IP_RULE_CREATE", label: "新增访问规则" },
      { action: "IP_RULE_UPDATE", label: "更新访问规则" },
      { action: "IP_RULE_DELETE", label: "删除访问规则" },
      { action: "IP_RULE_EXPORT", label: "导出边缘层封禁名单" },
    ],
  },
  server: {
    i18n: IP_ACCESS_SERVER_I18N,

    /**
     * 判定挂在**认证之前**：被封的 IP 不该先跑一遍 JWT 验签、租户查库、
     * 权限计算再被拒。见 `registerEarlyMiddleware` 的契约说明。
     */
    registerEarlyMiddleware: async (app) => {
      await ipAccessMiddleware(app);
    },

    onBoot: async (ctx) => {
      subscribeIpAccessInvalidation();

      // 自动封禁：内核发事件，本模块订阅。内核不认识 ip-access，单向依赖不破。
      ctx.events.on("auth.login_failed", async (payload) => {
        await reportAbuse({
          ip: payload.ip,
          kind: "login_failure",
          detail: payload.username ? `username=${payload.username}` : undefined,
        });
      });
      ctx.events.on("auth.login_succeeded", async (payload) => {
        await clearAbuseCounter("login_failure", payload.ip);
      });

      // 启动时对齐一次边缘层名单：进程可能是在导出失败之后重启的
      scheduleNginxExport();
    },

    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "ip-access", async (scoped) => {
        await scoped.register(ipAccessRoutes, { prefix: "/api/ip-rules" });
      });

      await app.register(
        async (platformApp) => {
          platformApp.addHook("onRequest", app.requirePlatformAdmin);
          await registerPlatformIpAccessRoutes(platformApp);
        },
        { prefix: "/api/platform" },
      );
    },

    registerJobs: (ctx) => {
      registerIpAccessJobs(ctx);
    },
  },
};
