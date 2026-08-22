/**
 * 发信配置与投递记录的租户面。
 *
 * 投递本身**没有 HTTP 入口**：一封信只能由服务端调 `MailProvider.send()` 发出。
 * 开一个「发任意邮件」的接口等于给后台账号一台开放中继，一旦某个角色被过度授权，
 * 这个站的发信域就会被拿去发垃圾邮件，然后整域进黑名单。
 */


import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { parseSortDir } from "@rewindom/server-kernel/http/list-sort.js";
import { parsePagination } from "@rewindom/server-kernel/http/pagination.js";
import { sendCodedError } from "@rewindom/server-kernel/http/route-error-handler.js";
import { AppError, ValidationError } from "@rewindom/server-kernel/lib/app-errors.js";
import { emitAuditLogFromRequestSafe } from "@rewindom/server-kernel/runtime/audit-log-emit.js";

import { AuditAction } from "../../audit/shared/index.js";

import { getDelivery, listDeliveries } from "./delivery.service.js";
import { retryDeliveryNow, sendMail } from "./mail.service.js";
import { getMailerConfigStatus, updateMailerConfig } from "./mailer.config.js";

import type {
  MailerConfigWriteBody,
  MailerTestSendBody,
} from "../shared/index.js";
import type { FastifyInstance } from "fastify";

/** 极简的邮箱形状校验：真正的判据是那封信发不发得到，不是正则写得多细。 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export async function mailerRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: "/config",
    context: "MailerConfig",
    errorCode: "MAILER_CONFIG_FAILED",
    preHandler: [app.requirePermission("mailer.read")],
    handler: async (request) =>
      getMailerConfigStatus(request.tenantContext!.tenant_id),
  });

  defineRoute(app, {
    method: "PUT",
    url: "/config",
    context: "MailerConfigUpdate",
    errorCode: "MAILER_CONFIG_UPDATE_FAILED",
    preHandler: [app.requirePermission("mailer.write")],
    handler: async (request, reply) => {
      try {
        const body = request.body as MailerConfigWriteBody;
        const status = await updateMailerConfig(
          request.tenantContext!.tenant_id,
          body,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.MAILER_CONFIG_UPDATE,
          resource: "mail_transport",
          detail_key: "mailer.audit.config_updated",
          // 只记来源与通道，**绝不记凭据**——审计日志本身也是会被导出的
          detail_params: {
            driver: status.driver ?? "-",
            source: status.source ?? "-",
          },
        });

        return status;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/test",
    context: "MailerTestSend",
    errorCode: "MAILER_TEST_SEND_FAILED",
    preHandler: [app.requirePermission("mailer.write")],
    handler: async (request, reply) => {
      try {
        const body = (request.body ?? {}) as MailerTestSendBody;
        const to = body.to?.trim();
        if (!to || !EMAIL_RE.test(to)) {
          throw new ValidationError("mailer.test_recipient_invalid");
        }

        const tenantId = request.tenantContext!.tenant_id;
        const result = await sendMail(
          {
            tenant_id: tenantId,
            to,
            subject: "rewindom 发信测试",
            html: "<p>这是一封测试邮件。收到它说明本站的发信通道可用。</p>",
            text: "这是一封测试邮件。收到它说明本站的发信通道可用。",
            source: "mailer.test",
            /*
             * 幂等键带时间戳：测试信就是要能反复发。其它调用方必须给稳定的键，
             * 这里是唯一的例外，所以理由写在这。
             */
            idempotency_key: `mailer.test:${request.authUser!.userId}:${Date.now()}`,
          },
          app.log,
        );

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.MAILER_TEST_SEND,
          resource: result.delivery_id,
          detail_key: "mailer.audit.test_sent",
          detail_params: { to },
        });

        return result;
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
    url: "/",
    context: "MailDeliveryList",
    errorCode: "MAILER_DELIVERY_LIST_FAILED",
    preHandler: [app.requirePermission("mailer.read")],
    handler: async (request) => {
      const { q, status, source, sort_by, sort_dir, unmask } =
        request.query as Record<string, string>;
      const { page, page_size } = parsePagination(
        request.query as Record<string, unknown>,
      );

      return listDeliveries({
        tenant_id: request.tenantContext!.tenant_id,
        page,
        page_size,
        q,
        status,
        source,
        sort_by,
        sort_dir: parseSortDir(sort_dir),
        // 解掩码要写权限：读投递记录是排障，看全址是接触个人数据，两件事
        unmask:
          unmask === "true" &&
          (await app.hasPermission(request, "mailer.write")),
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: "/:deliveryId",
    context: "MailDeliveryDetail",
    errorCode: "MAILER_DELIVERY_DETAIL_FAILED",
    preHandler: [app.requirePermission("mailer.read")],
    handler: async (request, reply) => {
      try {
        const { deliveryId } = request.params as { deliveryId: string };
        return await getDelivery(
          request.tenantContext!.tenant_id,
          deliveryId,
          { unmask: await app.hasPermission(request, "mailer.write") },
        );
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });

  defineRoute(app, {
    method: "POST",
    url: "/:deliveryId/retry",
    context: "MailDeliveryRetry",
    errorCode: "MAILER_DELIVERY_RETRY_FAILED",
    preHandler: [app.requirePermission("mailer.write")],
    handler: async (request, reply) => {
      try {
        const { deliveryId } = request.params as { deliveryId: string };
        const tenantId = request.tenantContext!.tenant_id;
        // 复用同一个幂等键与正文：这是「再发一次那封信」，不是「发一封新的」
        const result = await retryDeliveryNow(tenantId, deliveryId, app.log);

        await emitAuditLogFromRequestSafe(app.events, app.log, request, {
          userId: request.authUser!.userId,
          username: request.authUser!.username,
          action: AuditAction.MAILER_DELIVERY_RETRY,
          resource: deliveryId,
          detail_key: "mailer.audit.delivery_retried",
          detail_params: { status: result.status },
        });

        return result;
      } catch (err) {
        if (err instanceof AppError && err.code) {
          return sendCodedError(reply, err.status, err.code, err.params);
        }
        throw err;
      }
    },
  });
}
