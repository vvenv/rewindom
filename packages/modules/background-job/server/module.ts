import { backgroundJobRoutes } from "./routes.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const backgroundJobServerModule: ServerAppModule = {
  id: "background-job",
  version: "1.0.0",
  label: "Background Jobs",
  kind: "infrastructure",
  description: "后台任务 API 与调度器注册",
  requires: ["rbac", "audit"],
  server: {
    registerRoutes: async (app) => {
      await app.register(backgroundJobRoutes, { prefix: "/api/background-jobs" });
    },
  },
};
