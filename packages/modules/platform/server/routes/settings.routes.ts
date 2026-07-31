import {
  handleRouteError,
  handleValidationError,
} from "@be-water/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import {
  isAppLocale,
  isShellLayoutSlug,
  isThemePaletteSlug,
  success,
} from "@be-water/shared";

import { AuditAction } from "../../../audit/shared/index.js";
import { type PlatformSettings } from "../../shared/index.js";
import {
  getPlanLimitTemplates,
  savePlanLimitTemplates,
} from "../services/plan-limit-templates.service.js";
import {
  getPlatformSettings,
  savePlatformSettings,
} from "../services/platform-settings.service.js";

import type { FastifyInstance } from "fastify";

interface UpdatePlatformSettingsBody {
  registration_enabled?: boolean;
  require_tenant_approval?: boolean;
  captcha_enabled?: boolean;
  default_theme?: string;
  default_layout?: string;
  default_locale?: string;
}

export async function registerSettingsRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/settings", async (_request, reply) => {
    try {
      const config = await getPlatformSettings();
      return reply.send(success(config));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformSettingsRoutes] 获取平台设置失败",
        "GET_PLATFORM_SETTINGS_FAILED",
      );
    }
  });

  app.put("/settings", async (request, reply) => {
    try {
      const {
        registration_enabled,
        require_tenant_approval,
        captcha_enabled,
        default_theme,
        default_layout,
        default_locale,
      } = request.body as UpdatePlatformSettingsBody;

      if (default_theme !== undefined && !isThemePaletteSlug(default_theme)) {
        return handleValidationError(reply, "theme.invalid");
      }
      if (default_layout !== undefined && !isShellLayoutSlug(default_layout)) {
        return handleValidationError(reply, "layout.invalid");
      }
      if (default_locale !== undefined && !isAppLocale(default_locale)) {
        return handleValidationError(reply, "locale.invalid");
      }

      const currentConfig = await getPlatformSettings();
      const newConfig: PlatformSettings = {
        registration_enabled:
          registration_enabled ?? currentConfig.registration_enabled,
        require_tenant_approval:
          require_tenant_approval ?? currentConfig.require_tenant_approval,
        captcha_enabled: captcha_enabled ?? currentConfig.captcha_enabled,
        default_theme: default_theme ?? currentConfig.default_theme,
        default_layout: default_layout ?? currentConfig.default_layout,
        default_locale: default_locale ?? currentConfig.default_locale,
      };

      await savePlatformSettings(newConfig);

      try {
        const { username } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username,
          action: AuditAction.PLATFORM_SETTINGS_UPDATE,
          resource: "platform_settings",
          detail_key: "platform.audit.settings_updated",
          detail_params: {
            before: JSON.stringify(currentConfig),
            after: JSON.stringify(newConfig),
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
      } catch (auditError) {
        app.log.error({ error: auditError }, "记录审计日志失败");
      }

      return reply.send(success(newConfig));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformSaasRoutes] 更新平台设置失败",
        "UPDATE_PLATFORM_SETTINGS_FAILED",
      );
    }
  });

  app.get("/plan-limits", async (_request, reply) => {
    try {
      const templates = await getPlanLimitTemplates();
      return reply.send(success({ templates }));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformSettingsRoutes] 获取套餐用量模板失败",
        "GET_PLAN_LIMIT_TEMPLATES_FAILED",
      );
    }
  });

  app.put("/plan-limits", async (request, reply) => {
    try {
      const body = request.body as { templates?: unknown };
      const currentTemplates = await getPlanLimitTemplates();
      const saved = await savePlanLimitTemplates(body.templates);

      try {
        const { username } = request.authUser!;
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          username,
          action: AuditAction.PLAN_LIMIT_TEMPLATES_UPDATE,
          resource: "plan_limit_templates",
          detail_key: "platform.audit.plan_limit_templates_updated",
          detail_params: {
            before: JSON.stringify(currentTemplates),
            after: JSON.stringify(saved),
          },
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
        });
      } catch (auditError) {
        app.log.error({ error: auditError }, "记录审计日志失败");
      }

      return reply.send(success({ templates: saved }));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "[platformSettingsRoutes] 更新套餐用量模板失败",
        "UPDATE_PLAN_LIMIT_TEMPLATES_FAILED",
      );
    }
  });
}
