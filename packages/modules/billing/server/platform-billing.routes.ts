import { defineRoute } from "@be-water/server-kernel/http/define-route.js";
import { parseSortDir } from "@be-water/server-kernel/http/list-sort.js";
import { parsePagination } from "@be-water/server-kernel/http/pagination.js";

import {
  listPlatformPayments,
  listPlatformSubscriptions,
} from "./billing.service.js";

import type { FastifyInstance } from "fastify";

export async function registerPlatformBillingRoutes(
  app: FastifyInstance,
): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/billing/subscriptions",
    context: "PlatformBillingSubscriptionList",
    errorCode: "PLATFORM_BILLING_SUBSCRIPTION_LIST_FAILED",
    handler: async (request) => {
      const { plan_slug, status, tenant_id, sort_by, sort_dir } =
        request.query as {
          plan_slug?: string;
          status?: string;
          tenant_id?: string;
          sort_by?: string;
          sort_dir?: string;
        };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listPlatformSubscriptions({
        page,
        page_size,
        plan_slug,
        status,
        tenant_id,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/billing/payments",
    context: "PlatformBillingPaymentList",
    errorCode: "PLATFORM_BILLING_PAYMENT_LIST_FAILED",
    handler: async (request) => {
      const { status, tenant_id, sort_by, sort_dir } = request.query as {
        status?: string;
        tenant_id?: string;
        sort_by?: string;
        sort_dir?: string;
      };
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listPlatformPayments({
        page,
        page_size,
        status,
        tenant_id,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
      });
    },
  });
}
