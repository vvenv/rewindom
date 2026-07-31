import { Readable } from "node:stream";

import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";
import {
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import {
  handleCreemWebhookEvent,
  verifyAndParseCreemWebhook,
} from "./billing-webhook.service.js";
import {
  cancelCurrentSubscription,
  createCheckoutSession,
  getCurrentSubscription,
  listBillingPlanOffers,
  listTenantPayments,
} from "./billing.service.js";

import type { FastifyInstance, FastifyRequest } from "fastify";

type RequestWithRawBody = FastifyRequest & { rawBody?: string };

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

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/subscription",
    context: "BillingSubscriptionGet",
    errorCode: "BILLING_SUBSCRIPTION_GET_FAILED",
    preHandler: [app.requirePermission("billing.read")],
    handler: async (request) => {
      return getCurrentSubscription(request.tenantContext!.tenant_id);
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/payments",
    context: "BillingPaymentList",
    errorCode: "BILLING_PAYMENT_LIST_FAILED",
    preHandler: [app.requirePermission("billing.read")],
    handler: async (request) => {
      const { sort_by, sort_dir } = request.query as {
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listTenantPayments({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/plans",
    context: "BillingPlanList",
    errorCode: "BILLING_PLAN_LIST_FAILED",
    preHandler: [app.requirePermission("billing.read")],
    handler: async () => listBillingPlanOffers(),
  });

  defineRoute(app, {
    method: "POST",
    url: "/checkouts",
    context: "BillingCheckoutCreate",
    errorCode: "BILLING_CHECKOUT_CREATE_FAILED",
    preHandler: [app.requirePermission("billing.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as { plan_slug?: string };
        if (!body.plan_slug?.trim()) {
          return reply.code(400).send({ error: "plan_slug 必填" });
        }
        const result = await createCheckoutSession({
          tenant_id: request.tenantContext!.tenant_id,
          plan_slug: body.plan_slug.trim(),
          user_id: request.authUser!.userId,
          customer_email: undefined,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.BILLING_CHECKOUT_CREATE,
          resource: body.plan_slug,
          detail_key: "billing.audit.checkout_created",
          detail_params: { plan_slug: body.plan_slug },
        });

        return result;
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: err.message });
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/subscription/cancel",
    context: "BillingSubscriptionCancel",
    errorCode: "BILLING_SUBSCRIPTION_CANCEL_FAILED",
    preHandler: [app.requirePermission("billing.write")],
    handler: async (request, reply) => {
      try {
        const result = await cancelCurrentSubscription({
          tenant_id: request.tenantContext!.tenant_id,
        });

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.BILLING_SUBSCRIPTION_CANCEL,
          resource: result.id,
          detail_key: "billing.audit.subscription_cancelled",
          detail_params: {
            provider_subscription_id: result.provider_subscription_id,
          },
        });

        return result;
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.code(404).send({ error: err.message });
        }
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: err.message });
        }
        throw err;
      }
    },
  });
}

export async function billingWebhookRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.addHook("preParsing", captureRawBody);

  app.post("/creem", async (request, reply) => {
    try {
      const rawBody = (request as RequestWithRawBody).rawBody;
      if (!rawBody) {
        return reply.code(400).send({ error: "missing raw body" });
      }

      const event = await verifyAndParseCreemWebhook(
        rawBody,
        request.headers as Record<string, string | string[] | undefined>,
      );
      const result = await handleCreemWebhookEvent(event);

      app.log.info(
        { eventType: event.type, result },
        "[billing] creem webhook processed",
      );

      try {
        await app.events.emit("audit.log", {
          username: "creem-webhook",
          action: AuditAction.BILLING_WEBHOOK_SYNC,
          resource: event.id ?? event.type,
          detail_key: "billing.audit.webhook_synced",
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
        app.log.warn({ err: auditErr }, "[billing] webhook audit failed");
      }

      return reply.code(200).send({ data: result });
    } catch (err) {
      app.log.error({ err }, "[billing] creem webhook failed");
      return reply.code(400).send({
        error: err instanceof Error ? err.message : "webhook failed",
      });
    }
  });
}
