/**
 * 投递回调（Resend）。
 *
 * **只落数据 + 发领域事件，不做业务决定。** 「这个地址以后还发不发」是调用方的事
 * ——newsletter 要停发，将来 site-member 的验证信可能只想提示用户换个邮箱。
 * mailer 是基础设施，不替业务决定。
 *
 * 这条路由**不进 entitlement 网关，也不认租户 Host**：它是机器对机器的固定地址，
 * 验签就是它的认证。租户把 mailer 关掉之后，在途的回调仍然应该被记下来——
 * 那正是「为什么关掉前最后几封没送到」的证据。
 */
import { Readable } from "node:stream";

import { defineRoute } from "@rewindom/server-kernel/http/define-route.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import { verifyWebhookSignature } from "./webhook.signature.js";

import type { MailBounceType } from "../shared/index.js";
import type { FastifyInstance, FastifyRequest } from "fastify";

type RequestWithRawBody = FastifyRequest & { rawBody?: string };

/**
 * 留住原始请求体。
 *
 * 验签算的是**原始字节**——Fastify 解析成对象再 `JSON.stringify` 回去，键顺序、
 * 空格、Unicode 转义都可能变，签出来的值必然对不上。与 billing 的 Creem webhook
 * 同一手法。
 */
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

interface ResendWebhookBody {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[];
    bounce?: { type?: string };
  };
}

/**
 * Resend 的 bounce 分类落到我们的两档上。
 *
 * 认不出来时按 **soft** 处理——软退信要连续几次才停发，猜错的代价是「多试几次」；
 * 按 hard 猜错则是「因为一次误判永久丢掉一个真实读者」。往安全的方向倒。
 */
function bounceType(raw: string | undefined): MailBounceType {
  return raw?.toLowerCase() === "hard" ? "hard" : "soft";
}

export async function mailerWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preParsing", captureRawBody);

  defineRoute(app, {
    method: "POST",
    url: "/webhook",
    context: "MailerWebhook",
    errorCode: "MAILER_WEBHOOK_FAILED",
    handler: async (request: FastifyRequest, reply) => {
      const verified = verifyWebhookSignature({
        secret: config.mail.webhookSecret,
        headers: {
          id: request.headers["svix-id"] as string | undefined,
          timestamp: request.headers["svix-timestamp"] as string | undefined,
          signature: request.headers["svix-signature"] as string | undefined,
        },
        // 原始请求体：重新 stringify 过的对象签不出同一个值
        rawBody: (request as RequestWithRawBody).rawBody ?? "",
      });

      if (!verified.ok) {
        /*
         * 一律 401 且不说为什么。告诉对方「时间戳过期」还是「签名不对」，
         * 等于给爆破者一个进度条。
         */
        app.log.warn({ reason: verified.reason }, "[mailer] 回调验签失败");
        return reply.status(401).send({ error: "unauthorized" });
      }

      const body = (request.body ?? {}) as ResendWebhookBody;
      const messageId = body.data?.email_id;
      const type = body.type ?? "";
      if (!messageId)
        return reply.status(202).send({ data: { ignored: true } });

      /*
       * 靠消息号回找，不靠收件人地址：地址会重复（同一个人订了几个列表），
       * 只有消息号是一一对应的。
       *
       * 找不到不是错误——回调可能对应保留期清理掉的老记录。
       */
      // eslint-disable-next-line tenant-scope/require-tenant-scope -- 回调没有租户上下文；provider_message_id 全局唯一，租户从命中的记录上读
      const delivery = await prisma.mailDelivery.findFirst({
        where: { provider_message_id: messageId },
        select: { id: true, tenant_id: true, to_email: true },
      });
      if (!delivery) {
        app.log.info({ messageId, type }, "[mailer] 回调没有对应的投递记录");
        return reply.status(202).send({ data: { ignored: true } });
      }

      if (type === "email.bounced") {
        const kind = bounceType(body.data?.bounce?.type);
        await prisma.mailDelivery.updateMany({
          where: { id: delivery.id, tenant_id: delivery.tenant_id },
          data: {
            status: "bounced",
            bounce_type: kind,
            bounced_at: new Date(),
            next_attempt_at: null,
          },
        });
        await app.events.emit("mail.bounced", {
          tenant_id: delivery.tenant_id,
          email: delivery.to_email,
          bounce_type: kind,
          delivery_id: delivery.id,
        });
      } else if (type === "email.complained") {
        await prisma.mailDelivery.updateMany({
          where: { id: delivery.id, tenant_id: delivery.tenant_id },
          data: {
            status: "complained",
            complained_at: new Date(),
            next_attempt_at: null,
          },
        });
        await app.events.emit("mail.complained", {
          tenant_id: delivery.tenant_id,
          email: delivery.to_email,
          delivery_id: delivery.id,
        });
      } else if (type === "email.delivered") {
        /*
         * 送达确认只在还没进终态时补记 sent_at。**不要覆盖 bounced/complained**：
         * 回调乱序到达是常态，delivered 后到会把一条已知的退信洗成成功。
         */
        await prisma.mailDelivery.updateMany({
          where: {
            id: delivery.id,
            tenant_id: delivery.tenant_id,
            status: { in: ["queued", "sent"] },
          },
          data: { status: "sent", sent_at: new Date() },
        });
        await app.events.emit("mail.delivered", {
          tenant_id: delivery.tenant_id,
          email: delivery.to_email,
          delivery_id: delivery.id,
        });
      }

      // 一律 202：回调方要的是「收到了」，业务结果不该影响它的重试决策
      return reply.status(202).send({ data: { accepted: true } });
    },
  });
}
