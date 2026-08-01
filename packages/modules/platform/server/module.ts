import { ensureBootstrapPlatformAdmin } from "@be-water/server-kernel/kernel/auth/platform-admin.service.js";

import { PLATFORM_SERVER_I18N } from "./i18n.js";
import { platformRoutes } from "./platform.routes.js";
import { tenantEntitlementsRoutes } from "./routes/tenant-entitlements.routes.js";
import { getPlatformSettings } from "./services/platform-settings.service.js";
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
        getPublicConfig: async () => {
          const settings = await getPlatformSettings();
          return {
            registration_enabled: settings.registration_enabled,
            captcha_enabled: settings.captcha_enabled,
            default_locale: settings.default_locale,
            github_oauth_enabled: false,
          };
        },
      });
      registry.setTenantRegistrationProvider({
        registerTenant: (input, jwtSign, ip, userAgent) =>
          registerTenant(input, jwtSign, ip, userAgent),
        registerOAuthTenant: (input, jwtSign, ip, userAgent) =>
          registerOAuthTenant(input, jwtSign, ip, userAgent),
      });
    },
    registerRoutes: async (app) => {
      await app.register(platformRoutes, { prefix: "/api/platform" });
      await app.register(tenantEntitlementsRoutes, { prefix: "/api/settings" });
    },
  },
};
