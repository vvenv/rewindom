import { isPlatformBackupDownloadTokenBypass } from "@rewindom/server-kernel/middleware/auth.middleware.js";

import { registerAdminRoutes } from "./routes/admin.routes.js";
import { registerBackupRoutes } from "./routes/backup.routes.js";
import { registerPlanPricingRoutes } from "./routes/plan-pricing.routes.js";
import { registerPlatformAdminRoutes } from "./routes/platform-admin.routes.js";
import { registerSettingsRoutes } from "./routes/settings.routes.js";
import { registerTenantRoutes } from "./routes/tenant.routes.js";

import type { FastifyInstance } from "fastify";

export async function platformRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", async (request, reply) => {
    const requestPath = request.url.split("?")[0] ?? "";
    const downloadToken = (request.query as { download_token?: unknown })
      .download_token;
    if (isPlatformBackupDownloadTokenBypass(requestPath, downloadToken)) {
      return;
    }
    return app.requirePlatformAdmin(request, reply);
  });
  await registerAdminRoutes(app);
  await registerPlatformAdminRoutes(app);
  await registerBackupRoutes(app);
  await registerTenantRoutes(app);
  await registerSettingsRoutes(app);
  await registerPlanPricingRoutes(app);
}
