import { dashboardPreferenceRoutes } from "./dashboard-preference.routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

/**
 * 只承载「用户级工作台布局」这一件事：卡片数据仍由各业务模块自己的 API 提供，
 * dashboard 服务端不代理任何业务查询。
 *
 * 不声明 `tenantEntitlements`：工作台是登录落地页，可被平台关掉就等于租户无处可去。
 */
export const dashboardServerModule: ServerAppModule = {
  id: "dashboard",
  version: "1.0.0",
  label: "Dashboard",
  kind: "infrastructure",
  description: "工作台用户级布局（卡片显隐与排序）",
  server: {
    registerRoutes: async (app) => {
      await app.register(dashboardPreferenceRoutes, { prefix: "/api/dashboard" });
    },
  },
};
