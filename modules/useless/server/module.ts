import {
  registerTenantGatedRoutes,
  type ServerAppModule,
} from "@rewindom/module-sdk/server";

import { THING_ENTITLEMENT } from "../shared/entitlements.js";

import { USELESS_SERVER_I18N } from "./i18n.js";
import { registerUselessSiteContributions } from "./sections/register.js";
import { thingRoutes } from "./thing.routes.js";

export const uselessServerModule: ServerAppModule = {
  id: "useless",
  version: "1.0.0",
  label: "Useless",
  kind: "business",
  description: "无用句子库——每天一条没有用的话",
  requires: ["rbac", "audit", "marketing"],
  tenantEntitlements: [THING_ENTITLEMENT],
  shared: {
    permissions: [
      {
        key: "things.read",
        label: "查看无用句子",
        group: "无用",
        description: "查看句子列表与详情",
      },
      {
        key: "things.write",
        label: "创建/编辑无用句子",
        group: "无用",
        description: "创建、编辑与删除句子",
      },
    ],
    auditActions: [
      { action: "THING_CREATE", label: "创建无用句子" },
      { action: "THING_UPDATE", label: "更新无用句子" },
      { action: "THING_DELETE", label: "删除无用句子" },
    ],
  },
  server: {
    i18n: USELESS_SERVER_I18N,
    onBoot: async () => {
      registerUselessSiteContributions();
    },
    registerRoutes: async (app) => {
      await registerTenantGatedRoutes(app, "useless", async (scoped) => {
        await scoped.register(thingRoutes, { prefix: "/api/things" });
      });
    },
  },
};
