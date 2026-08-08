import "./kernel-hooks.js";
import "./server-assembly.js";
import {
  failOrphanedFileJobsOnStartup,
} from "@be-water/builtin/background-job/server/job-exports.js";
import { ensureDefaultMarketingSite } from "@be-water/builtin/marketing/server/ensure-default-marketing-site.js";
import { ensureDefaultTenant } from "@be-water/builtin/platform/server/services/ensure-default-tenant.service.js";
import { ensurePlatformSystemUser } from "@be-water/builtin/platform/server/services/ensure-platform-system-user.service.js";
import { startBackgroundScheduler } from "@be-water/server-kernel/infra/scheduler.service.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { withDbConnectionRetry } from "@be-water/server-kernel/lib/db-connection-retry.js";

import { buildApp } from "./app.js";
import { runModuleBootHooks, getServerModuleLoader } from "./routes/index.js";
import { registerGracefulShutdown } from "./shutdown.js";

export async function bootstrap(): Promise<void> {
  const app = await buildApp();
  const { port, host } = config.server;

  try {
    await withDbConnectionRetry(async () => {
      await ensureDefaultTenant();
      await ensureDefaultMarketingSite();
      await ensurePlatformSystemUser();
      await runModuleBootHooks(app);
    }, app.log);
    await app.listen({ port, host });

    if (config.server.workersEnabled) {
      startBackgroundScheduler(app, getServerModuleLoader().getJobRegistry());
      await failOrphanedFileJobsOnStartup(app.log);
    } else {
      app.log.info("[bootstrap] WORKERS_ENABLED=false，跳过 scheduler 启动");
    }

    registerGracefulShutdown(app);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void bootstrap();
