import {
  handleRouteError,
} from "@rewindom/server-kernel/http/route-error-handler.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";
import { success } from "@rewindom/shared";

import { AuditAction } from "../../../audit/shared/index.js";
import { listedPlansOf } from "../../shared/plan-pricing.js";
import {
  getPlanCatalog,
  getPlanPricingConfig,
  savePlanPricingConfig,
} from "../services/plan-catalog.service.js";

import type { FastifyInstance } from "fastify";

/** 平台控制台：套餐定价与展示配置的读写（挂在 `/api/platform` 之下，已套平台管理员）。 */
export async function registerPlanPricingRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/plan-pricing", async (_request, reply) => {
    try {
      return reply.send(
        success({
          catalog: await getPlanCatalog(),
          overrides: await getPlanPricingConfig(),
        }),
      );
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "PlanPricingGet",
        "PLAN_PRICING_GET_FAILED",
      );
    }
  });

  app.put("/plan-pricing", async (request, reply) => {
    try {
      const catalog = await savePlanPricingConfig(request.body);

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser?.userId,
        username: request.authUser?.username ?? "platform",
        action: AuditAction.PLAN_PRICING_UPDATE,
        resource: "plan_pricing",
        detail_key: "platform.audit.plan_pricing_updated",
        detail_params: {},
      });

      return reply.send(success({ catalog }));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "PlanPricingUpdate",
        "PLAN_PRICING_UPDATE_FAILED",
      );
    }
  });
}

/**
 * 公开只读：官网定价区展示的就是这几档。
 *
 * 免认证是**故意**的——这份数据本来就印在公开定价页上，没有任何秘密可言。
 * 主题编辑器的预览也读它：预览要画的正是访客会看见的东西，不该因为编辑者
 * 没有平台管理员身份就退化成占位样张。
 */
export async function registerPublicPlanRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get("/plans", async (_request, reply) => {
    try {
      return reply.send(success(listedPlansOf(await getPlanCatalog())));
    } catch (err) {
      return handleRouteError(
        reply,
        err,
        "PublicPlanList",
        "PUBLIC_PLAN_LIST_FAILED",
      );
    }
  });
}
