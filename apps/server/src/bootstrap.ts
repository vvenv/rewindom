import "./kernel-hooks.js";
import "./server-assembly.js";
import {
  failOrphanedFileJobsOnStartup,
} from "@rewindom/builtin/background-job/server/job-exports.js";
import { ensurePlatformSystemUser } from "@rewindom/builtin/platform/server/services/ensure-platform-system-user.service.js";
import { startBackgroundScheduler } from "@rewindom/server-kernel/infra/scheduler.service.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { withDbConnectionRetry } from "@rewindom/server-kernel/lib/db-connection-retry.js";

import { buildApp } from "./app.js";
import { runModuleBootHooks, getServerModuleLoader } from "./routes/index.js";
import { registerGracefulShutdown } from "./shutdown.js";

export async function bootstrap(): Promise<void> {
  const app = await buildApp();
  const { port, host } = config.server;

  try {
    await withDbConnectionRetry(async () => {
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
