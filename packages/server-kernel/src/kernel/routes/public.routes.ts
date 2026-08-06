import { success } from "@be-water/shared";

import { handleRouteError } from "../../http/route-error-handler.js";
import { config as appConfig } from "../../lib/config.js";

import type { FastifyInstance } from "fastify";

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  app.get("/config", async (request, reply) => {
    try {
      const bound = request.hostTenantContext;
      const config = await app.registry
        .getPublicConfigProvider()
        .getPublicConfig({ bound_tenant: bound ?? null });
      const baseDomain = appConfig.tenant.baseDomain.trim() || null;
      const platformUrl = appConfig.platform.url.trim() || null;
      return reply.send(
        success({
          registration_enabled: config.registration_enabled,
          captcha_enabled: config.captcha_enabled,
          default_locale: config.default_locale,
          github_oauth_enabled: appConfig.auth.github.enabled,
          google_oauth_enabled: appConfig.auth.google.enabled,
          single_tenant: appConfig.tenant.singleTenant,
          bound_tenant: config.bound_tenant,
          tenant_base_domain: baseDomain,
          platform_url: platformUrl,
        }),
      );
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[publicRoutes] 获取公开设置失败",
        "platform.public_settings_failed",
      );
    }
  });
}
