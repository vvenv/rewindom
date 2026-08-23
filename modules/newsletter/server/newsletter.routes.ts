/**
 * 订阅名单的工作台面。
 *
 * 这里**没有创建订阅的接口**：订阅是访客自己的行为，后台替人订等于绕过双重确认，
 * 那正是垃圾邮件的做法。名单导入同理（记在 spec 的 out_of_scope）。
 */
import {
  deleteSubscriber,
  exportConfirmedSubscribers,
  listDigestRuns,
  listSubscribers,
} from "./subscriber-query.service.js";
import { reactivateSubscriber } from "./bounce.service.js";
import { runDigests } from "./digest.service.js";
import { listAvailableLists } from "./subscriber.service.js";

import { AuditAction } from "@rewindom/builtin/audit/shared/index.js";
import {
  AppError,
  defineRoute,
  emitAuditLogFromRequestSafe,
  parsePagination,
  parseSortDir,
  resolveRequestLocale,
  sendCodedError,
} from "@rewindom/module-sdk/server";

import type { FastifyInstance } from "fastify";

export async function newsletterRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/",
    context: "NewsletterSubscriberList",
    errorCode: "NEWSLETTER_LIST_FAILED",
    preHandler: [app.requirePermission("newsletter.read")],
    handler: async (request) => {
      const { q, status, list_key, sort_by, sort_dir, unmask } =
        request.query as Record<string, string>;
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );
      return listSubscribers({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q,
        status,
        list_key,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
        // 解掩码要写权限：看名单是运营，看全址是接触个人数据，两件事
        unmask:
          unmask === "true" &&
          (await app.hasPermission(request, "newsletter.write")),
      });
    },
  });

  /** 本站有哪些可订阅列表——站长核对 key 用，也是订阅段留空时实际会订的那些。 */
  defineRoute(app, {
    method: "GET",
    url: "/lists",
    context: "NewsletterLists",
    errorCode: "NEWSLETTER_LISTS_FAILED",
    preHandler: [app.requirePermission("newsletter.read")],
    handler: async (request) => {
      /*
       * 显式 `locale` 优先于 `resolveRequestLocale`：编辑器预览要的是**当前选中页面**
       * 的语言，而 api client 的 Accept-Language 写的是工作台界面语言。
       * 两者不一致时，下拉里的列表名会和实站显示的不是同一份。
       */
      const { locale } = request.query as { locale?: string };
      return {
        items: await listAvailableLists({
          tenant_id: request.tenantContext!.tenant_id,
          locale: locale?.trim() || resolveRequestLocale(request),
        }),
      };
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/runs",
    context: "NewsletterDigestRuns",
    errorCode: "NEWSLETTER_RUNS_FAILED",
    preHandler: [app.requirePermission("newsletter.read")],
    handler: async (request) => ({
      items: await listDigestRuns(request.tenantContext!.tenant_id),
    }),
  });

  defineRoute(app, {
    method: "GET",
    url: "/export",
    context: "NewsletterExport",
    errorCode: "NEWSLETTER_EXPORT_FAILED",
    preHandler: [app.requirePermission("newsletter.write")],
    handler: async (request, reply) => {
      const tenantId = request.tenantContext!.tenant_id;
      const csv = await exportConfirmedSubscribers(tenantId);

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.NEWSLETTER_SUBSCRIBER_EXPORT,
        resource: "subscribers",
        detail_key: "newsletter.audit.exported",
        detail_params: {},
      });

      return reply
        .type("text/csv; charset=utf-8")
        .header("content-disposition", 'attachment; filename="subscribers.csv"')
        .send(csv);
    },
  });

  defineRoute(app, {
    method: "DELETE",
    url: "/:subscriberId",
    context: "NewsletterSubscriberDelete",
    errorCode: "NEWSLETTER_DELETE_FAILED",
    preHandler: [app.requirePermission("newsletter.write")],
    handler: async (request, reply) => {
      try {
        const { subscriberId } = request.params as { subscriberId: string };
        const tenantId = request.tenantContext!.tenant_id;
        const email = await deleteSubscriber(tenantId, subscriberId);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.NEWSLETTER_SUBSCRIBER_DELETE,
          resource: subscriberId,
          detail_key: "newsletter.audit.deleted",
          // 删除留痕要记地址：订阅者名单是个人数据，谁删了谁必须查得到
          detail_params: { email },
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

  /**
   * 人工恢复停发。
   *
   * **投诉过的地址走不到这里**（service 直接拒）：把一个刚举报过你的人重新加回名单，
   * 法律与声誉上都是站长在给自己挖坑。要恢复得手工改库，故意做得比点一下麻烦。
   */
  defineRoute(app, {
    method: "POST",
    url: "/:subscriberId/reactivate",
    context: "NewsletterSubscriberReactivate",
    errorCode: "NEWSLETTER_REACTIVATE_FAILED",
    preHandler: [app.requirePermission("newsletter.write")],
    handler: async (request, reply) => {
      const { subscriberId } = request.params as { subscriberId: string };
      const tenantId = request.tenantContext!.tenant_id;
      const outcome = await reactivateSubscriber(tenantId, subscriberId);

      if (outcome === "not_found") {
        return sendCodedError(reply, 404, "newsletter.subscriber_not_found");
      }
      if (outcome === "complained") {
        return sendCodedError(reply, 409, "newsletter.reactivate_complained");
      }

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.NEWSLETTER_SUBSCRIBER_REACTIVATE,
        resource: subscriberId,
        detail_key: "newsletter.audit.reactivated",
        detail_params: {},
      });

      return { reactivated: true };
    },
  });

  /** 手动跑一轮摘要。给站长排障用——「到底为什么没发出去」。 */
  defineRoute(app, {
    method: "POST",
    url: "/runs",
    context: "NewsletterDigestRun",
    errorCode: "NEWSLETTER_RUN_FAILED",
    preHandler: [app.requirePermission("newsletter.write")],
    handler: async (request) => {
      const summary = await runDigests(app, app.log);

      await emitAuditLogFromRequestSafe(app.events, app.log, request, {
        userId: request.authUser!.userId,
        username: request.authUser!.username,
        action: AuditAction.NEWSLETTER_DIGEST_RUN,
        resource: "digest",
        detail_key: "newsletter.audit.digest_run",
        detail_params: { sent: String(summary.sent) },
      });

      return summary;
    },
  });
}
