import { registerTenantGatedRoutes } from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";

import { MAILER_ENTITLEMENT } from "../shared/index.js";

import { MAILER_SERVER_I18N } from "./i18n.js";
import { createMailProvider } from "./mailer.provider.js";
import { mailerRoutes } from "./mailer.routes.js";
import { registerMailerRetryJob } from "./retry.job.js";



import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const mailerServerModule: ServerAppModule = {
  id: "mailer",
  version: "1.0.0",
  label: "Mailer",
  kind: "infrastructure",
  description: "发信通道：租户/平台两级配置、driver 可插拔、投递记录与重试",
  /*
   * platform 是横切能力（provider 里用它读租户开关），按依赖规则 infra → platform
   * 不必声明，但写出来图更清楚。
   *
   * **没有任何模块反过来 requires mailer**：消费方一律经
   * `app.registry.getMailProvider()` 拿能力，编译期不 import 本包。
   */
  requires: ["rbac", "audit", "platform"],
  tenantEntitlements: [MAILER_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "mailer.read",
        label: "查看发信配置",
        group: "邮件发送",
        description: "查看发信通道状态与投递记录",
      },
      {
        key: "mailer.write",
        label: "管理发信配置",
        group: "邮件发送",
        description: "配置发信通道、发送测试邮件、重试失败投递",
      },
    ],
    auditActions: [
      { action: "MAILER_CONFIG_UPDATE", label: "更新发信配置" },
      { action: "MAILER_TEST_SEND", label: "发送测试邮件" },
      { action: "MAILER_DELIVERY_RETRY", label: "重试失败投递" },
    ],
  },
  server: {
    i18n: MAILER_SERVER_I18N,
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "mailer", async (scoped) => {
        await scoped.register(mailerRoutes, { prefix: "/api/mailer" });
      });
    },
    /*
     * provider 在 onBoot 注册而不是 registerProviders：实现需要一个 logger
     * （`log` driver 要往日志里写整封邮件，失败重试也要上报），而
     * `registerProviders(registry)` 只拿得到注册表。
     */
    onBoot: async (ctx) => {
      ctx.registry.setMailProvider(createMailProvider(ctx.log));
    },
    registerJobs: registerMailerRetryJob,
  },
};
