import { Readable } from "node:stream";

import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { sendCodedError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import {
  getSiteBillingProviderStatus,
  updateSiteBillingProvider,
} from "./provider-credentials.js";
import {
  handleSiteBillingWebhook,
  peekTenantId,
  verifySiteBillingWebhook,
} from "./site-billing-webhook.service.js";
import {
  createMemberPlan,
  deleteMemberPlan,
  listMemberPayments,
  listMemberPlans,
  listMemberSubscriptions,
  updateMemberPlan,
} from "./site-billing.service.js";

import type { MemberPlanWriteBody } from "../shared/site-billing.js";
import type { FastifyInstance, FastifyRequest } from "fastify";

type RequestWithRawBody = FastifyRequest & { rawBody?: string };

/** 验签要的是**原始字节**，Fastify 解析过的 body 已经不是原文了。 */
async function captureRawBody(
  request: FastifyRequest,
  _reply: unknown,
  payload: NodeJS.ReadableStream,
): Promise<Readable> {
  const chunks: Buffer[] = [];
  for await (const chunk of payload) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks);
  (request as RequestWithRawBody).rawBody = raw.toString("utf8");
  return Readable.from(raw);
}

function webhookUrl(): string {
  return `${config.frontend.url.replace(/\/$/, "")}/api/site-billing/webhooks/creem`;
}

export async function siteBillingRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/plans",
    context: "SiteBillingPlanList",
    errorCode: "SITE_BILLING_PLAN_LIST_FAILED",
    preHandler: [app.requirePermission("site_billing.read")],
    handler: async (request) =>
      listMemberPlans(request.tenantContext!.tenant_id),
  });

  defineRoute(app, {
    method: "POST",
    url: "/plans",
    context: "SiteBillingPlanCreate",
    errorCode: "SITE_BILLING_PLAN_CREATE_FAILED",
    preHandler: [app.requirePermission("site_billing.write")],
    handler: async (request, reply) => {
      try {
        const plan = await createMemberPlan({
          tenant_id: request.tenantContext!.tenant_id,
          body: request.body as MemberPlanWriteBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_BILLING_PLAN_CREATE,
          resource: plan.slug,
          detail_key: "site_billing.audit.plan_created",
          detail_params: { slug: plan.slug },
        });
        return plan;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "PUT",
    url: "/plans/:planId",
    context: "SiteBillingPlanUpdate",
    errorCode: "SITE_BILLING_PLAN_UPDATE_FAILED",
    preHandler: [app.requirePermission("site_billing.write")],
    handler: async (request, reply) => {
      try {
        const { planId } = request.params as { planId: string };
        const plan = await updateMemberPlan({
          tenant_id: request.tenantContext!.tenant_id,
          plan_id: planId,
          body: request.body as MemberPlanWriteBody,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_BILLING_PLAN_UPDATE,
          resource: plan.slug,
          detail_key: "site_billing.audit.plan_updated",
          detail_params: { slug: plan.slug },
        });
        return plan;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/plans/:planId",
    context: "SiteBillingPlanDelete",
    errorCode: "SITE_BILLING_PLAN_DELETE_FAILED",
    preHandler: [app.requirePermission("site_billing.write")],
    handler: async (request, reply) => {
      try {
        const { planId } = request.params as { planId: string };
        await deleteMemberPlan({
          tenant_id: request.tenantContext!.tenant_id,
          plan_id: planId,
        });
        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.SITE_BILLING_PLAN_DELETE,
          resource: planId,
          detail_key: "site_billing.audit.plan_deleted",
          detail_params: { plan_id: planId },
        });
        return { deleted: true };
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/subscriptions",
    context: "SiteBillingSubscriptionList",
    errorCode: "SITE_BILLING_SUBSCRIPTION_LIST_FAILED",
    preHandler: [app.requirePermission("site_billing.read")],
    handler: async (request) => {
      const query = request.query as {
        status?: string;
        plan_slug?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listMemberSubscriptions({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        status: query.status,
        plan_slug: query.plan_slug,
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/payments",
    context: "SiteBillingPaymentList",
    errorCode: "SITE_BILLING_PAYMENT_LIST_FAILED",
    preHandler: [app.requirePermission("site_billing.read")],
    handler: async (request) => {
      const query = request.query as {
        status?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listMemberPayments({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        status: query.status,
        sort_by: query.sort_by,
        sort_dir: parseSortDir(query.sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/provider",
    context: "SiteBillingProviderGet",
    errorCode: "SITE_BILLING_PROVIDER_GET_FAILED",
    preHandler: [app.requirePermission("site_billing.read")],
    handler: async (request) =>
      getSiteBillingProviderStatus({
        tenant_id: request.tenantContext!.tenant_id,
        webhook_url: webhookUrl(),
      }),
  });

  defineRoute(app, {
    method: "PUT",
    url: "/provider",
    context: "SiteBillingProviderUpdate",
    errorCode: "SITE_BILLING_PROVIDER_UPDATE_FAILED",
    preHandler: [app.requirePermission("site_billing.write")],
    handler: async (request) => {
      const body = request.body as {
        api_key?: string;
        webhook_secret?: string;
      };
      await updateSiteBillingProvider({
        tenant_id: request.tenantContext!.tenant_id,
        api_key: body.api_key,
        webhook_secret: body.webhook_secret,
      });

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.SITE_BILLING_PROVIDER_UPDATE,
        resource: "creem",
        detail_key: "site_billing.audit.provider_updated",
        // 审计里**不记**任何密钥片段：审计日志的可见面比设置页宽得多
        detail_params: {},
      });

      return getSiteBillingProviderStatus({
        tenant_id: request.tenantContext!.tenant_id,
        webhook_url: webhookUrl(),
      });
    },
  });
}

/**
 * 会员付费的 webhook（免 JWT）。
 *
 * 验签密钥按站点，而站点 id 在报文里——先不验签地抠出 `tenant_id` 只为查密钥，
 * 之后一切以验过的 payload 为准。详见 `site-billing-webhook.service.ts` 的文件头。
 */
export async function siteBillingWebhookRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.addHook("preParsing", captureRawBody);

  app.post("/creem", async (request, reply) => {
    try {
      const rawBody = (request as RequestWithRawBody).rawBody;
      if (!rawBody) {
        return sendCodedError(reply, 400, "site_billing.webhook_raw_body_missing");
      }

      const tenantId = peekTenantId(rawBody);
      if (!tenantId) {
        return sendCodedError(reply, 400, "site_billing.webhook_tenant_missing");
      }

      const event = await verifySiteBillingWebhook({
        tenant_id: tenantId,
        raw_body: rawBody,
        headers: request.headers as Record<string, string | string[] | undefined>,
      });
      if (!event) {
        // 验签失败与「这个站没配密钥」对外是同一个回答：不给探测者任何区分信号
        return sendCodedError(reply, 400, "site_billing.webhook_invalid");
      }

      const result = await handleSiteBillingWebhook({
        tenant_id: tenantId,
        event,
      });

      app.log.info(
        { eventType: event.type, result },
        "[site-billing] creem webhook processed",
      );

      try {
        await app.events.emit("audit.log", {
          username: "creem-webhook",
          action: AuditAction.SITE_BILLING_WEBHOOK_SYNC,
          resource: event.id ?? event.type,
          detail_key: "site_billing.audit.webhook_synced",
          detail_params: { event_type: event.type, detail: result.detail },
          ipAddress: request.ip,
          userAgent:
            typeof request.headers["user-agent"] === "string"
              ? request.headers["user-agent"]
              : undefined,
          tenant_slug: null,
          scope: "platform",
        });
      } catch (auditErr) {
        app.log.warn({ err: auditErr }, "[site-billing] webhook audit failed");
      }

      return reply.code(200).send({ data: result });
    } catch (err) {
      app.log.error({ err }, "[site-billing] creem webhook failed");
      return sendCodedError(reply, 400, "site_billing.webhook_failed");
    }
  });
}
