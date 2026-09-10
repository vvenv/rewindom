import { BACKGROUND_JOB_SERVER_I18N } from "./i18n.js";
import {
  registerPlatformScheduledJobRoutes,
  setScheduledJobRegistry,
} from "./platform-scheduled-job.routes.js";
import { backgroundJobRoutes } from "./routes.js";

import type { ServerAppModule } from "@rewindom/server-kernel/runtime/module-contract.js";

export const backgroundJobServerModule: ServerAppModule = {
  id: "background-job",
  version: "1.0.0",
  label: "Background Jobs",
  kind: "infrastructure",
  description: "后台任务 API 与调度器注册",
  requires: ["rbac", "audit"],
  server: {
    i18n: BACKGROUND_JOB_SERVER_I18N,
    registerRoutes: async (app) => {
      await app.register(backgroundJobRoutes, {
        prefix: "/api/background-jobs",
      });
      await app.register(
        async (platformApp) => {
          platformApp.addHook("onRequest", app.requirePlatformAdmin);
          await registerPlatformScheduledJobRoutes(platformApp);
        },
        { prefix: "/api/platform" },
      );
    },
    /** 本模块不注册任务，只在这里接住注册表——平台路由要读它的运行态。 */
    registerJobs: (ctx) => {
      setScheduledJobRegistry(ctx.registry);
    },
  },
};
