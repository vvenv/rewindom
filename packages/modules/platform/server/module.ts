import { ensureBootstrapPlatformAdmin } from "@be-water/server-kernel/kernel/auth/platform-admin.service.js";
import { config as appConfig } from "@be-water/server-kernel/lib/config.js";

import { PLATFORM_SERVER_I18N } from "./i18n.js";
import { platformRoutes } from "./platform.routes.js";
import {
  publicTenantBrandingRoutes,
  tenantBrandingRoutes,
} from "./routes/branding.routes.js";
import { tenantEntitlementsRoutes } from "./routes/tenant-entitlements.routes.js";
import { getPlatformSettings } from "./services/platform-settings.service.js";
import { getTenantBrandingUrls } from "./services/tenant-branding.service.js";
import {
  registerOAuthTenant,
  registerTenant,
} from "./services/tenant-registration.service.js";

import type { ServerAppModule } from "@be-water/server-kernel/runtime/module-contract.js";

export const platformServerModule: ServerAppModule = {
  id: "platform",
  version: "1.0.0",
  label: "Platform Admin",
  kind: "infrastructure",
  description: "平台管理员：租户、用户、备份、套餐等 API",
  requires: ["rbac", "audit", "background-job"],
  shared: {
    permissions: [
      {
        key: "settings.read",
        label: "查看租户设置",
        group: "系统设置",
        scope: "tenant",
      },
      {
        key: "settings.write",
        label: "管理租户设置",
        group: "系统设置",
        scope: "tenant",
      },
      {
        key: "platform.tenants.read",
        label: "查看租户",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.tenants.write",
        label: "管理租户",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.settings.read",
        label: "查看平台设置",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.settings.write",
        label: "管理平台设置",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.backup",
        label: "数据备份",
        group: "平台管理",
        scope: "platform",
      },
      {
        key: "platform.roles.read",
        label: "查看平台角色",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.roles.write",
        label: "管理平台角色",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.roles.assign",
        label: "分配平台角色",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.admins.read",
        label: "查看平台管理员",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.admins.write",
        label: "管理平台管理员",
        group: "平台权限",
        scope: "platform",
      },
      {
        key: "platform.admins.assign",
        label: "分配平台管理员角色",
        group: "平台权限",
        scope: "platform",
      },
    ],
  },
  server: {
    i18n: PLATFORM_SERVER_I18N,
    onBoot: async () => {
      await ensureBootstrapPlatformAdmin();
    },
    registerProviders: (registry) => {
      registry.setPublicConfigProvider({
        getPublicConfig: async (options) => {
          const settings = await getPlatformSettings();
          const hostTenant = options?.bound_tenant ?? null;
          let bound_tenant: {
            slug: string;
            name: string;
            logo_url: string | null;
            favicon_url: string | null;
          } | null = null;
          if (hostTenant) {
            const urls = await getTenantBrandingUrls(
              hostTenant.tenant_id,
              hostTenant.tenant_slug,
            );
            bound_tenant = {
              slug: hostTenant.tenant_slug,
              name: hostTenant.name,
              logo_url: urls.logo_url,
              favicon_url: urls.favicon_url,
            };
          }
          return {
            registration_enabled: settings.registration_enabled,
            captcha_enabled: settings.captcha_enabled,
            default_locale: settings.default_locale,
            github_oauth_enabled: false,
            google_oauth_enabled: false,
            single_tenant: appConfig.tenant.singleTenant,
            bound_tenant,
            tenant_base_domain: appConfig.tenant.baseDomain.trim() || null,
          };
        },
      });
      registry.setTenantRegistrationProvider({
        registerTenant: (input, jwtSign, ip, userAgent, options) =>
          registerTenant(input, jwtSign, ip, userAgent, options),
        registerOAuthTenant: (input, jwtSign, ip, userAgent, options) =>
          registerOAuthTenant(input, jwtSign, ip, userAgent, options),
      });
    },
    registerRoutes: async (app) => {
      await app.register(platformRoutes, { prefix: "/api/platform" });
      await app.register(tenantEntitlementsRoutes, { prefix: "/api/settings" });
      await app.register(tenantBrandingRoutes, { prefix: "/api/settings" });
      await app.register(publicTenantBrandingRoutes, { prefix: "/api/public" });
    },
  },
};
