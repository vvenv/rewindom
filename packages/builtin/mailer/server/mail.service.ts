/**
 * 发信：幂等、投递记录、指数退避重试。
 *
 * 三条硬口径，都在 MODULE.spec.yaml 的设计要点里论证过：
 *
 * 1. **没配置就抛，不留 queued 行。** 收下一封永远发不出去的信，比当场失败更糟——
 *    队列里会堆满死信，而调用方以为发出去了。
 * 2. **幂等键撞车不重发。** 靠 `@@unique([tenant_id, idempotency_key])` 拦，
 *    不靠「先查再写」：重试任务与在线发信并发时，那道窗口正好会漏。
 * 3. **失败只重试同一个通道。** 换通道就是换发信域和 IP，收件方当可疑源处理；
 *    而且超时不代表没发出去，换一家重发同一封 = 读者收两遍。
 */
import { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";

import {
  isRetriableError,
  transportErrorMessage,
  type MailTransport,
} from "./drivers/driver.js";
import { createLogTransport } from "./drivers/log.driver.js";
import { createSmtpTransport } from "./drivers/smtp.driver.js";
import { isUsable, resolveMailConfig, type ResolvedMailConfig  } from "./mailer.config.js";


import type {
  MailSendInput,
  MailSendResult,
} from "@rewindom/server-kernel/runtime/provider-contracts.js";
import type { FastifyBaseLogger } from "fastify";

/**
 * 退避梯度。前两档密是为了扛住中继重启这种几分钟就恢复的抖动，
 * 后面拉长是因为再不恢复就不是抖动了，密集重试只会白烧连接。
 */
const BACKOFF_MS = [
  60_000, // 1 分钟
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
  6 * 60 * 60_000,
];
const MAX_ATTEMPTS = BACKOFF_MS.length;

async function buildTransport(
  resolved: ResolvedMailConfig,
  log: FastifyBaseLogger,
): Promise<MailTransport> {
  if (resolved.driver === "log") return createLogTransport(log);
  return createSmtpTransport(resolved);
}

/** 幂等键命中已有行时，把它的状态映射回 provider 的返回值。 */
function existingResult(status: string, id: string): MailSendResult {
  return { delivery_id: id, status: status === "sent" ? "sent" : "queued" };
}

export async function sendMail(
  input: MailSendInput,
  log: FastifyBaseLogger,
): Promise<MailSendResult> {
  const resolved = await resolveMailConfig(input.tenant_id);
  if (!isUsable(resolved)) {
    throw new AppError({ code: "mailer.not_configured", status: 503 });
  }

  let delivery;
  try {
    delivery = await prisma.mailDelivery.create({
      data: {
        tenant_id: input.tenant_id,
        to_email: input.to,
        subject: input.subject,
        source: input.source,
        status: "queued",
        driver: resolved.driver ?? "",
        html: input.html,
        text: input.text,
        headers: (input.headers ?? null) as Prisma.InputJsonValue,
        idempotency_key: input.idempotency_key,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // 同一个 key 已经有一行了：这一封不发，回那一行
      const existing = await prisma.mailDelivery.findUnique({
        where: {
          tenant_id_idempotency_key: {
            tenant_id: input.tenant_id,
            idempotency_key: input.idempotency_key,
          },
        },
        select: { id: true, status: true },
      });
      if (existing) return existingResult(existing.status, existing.id);
    }
    throw err;
  }

  return attemptDelivery(input.tenant_id, delivery.id, resolved, log);
}

/**
 * 发一次，并按结果推进状态机。
 *
 * 与 `sendMail` 分开是为了让重试任务复用同一段：两条路径的状态推进必须逐字一致，
 * 否则「在线发失败」和「重试发失败」会留下两种不同的记录。
 */
async function attemptDelivery(
  tenantId: string,
  deliveryId: string,
  resolved: ResolvedMailConfig,
  log: FastifyBaseLogger,
): Promise<MailSendResult> {
  /*
   * 租户维度一路贯穿到这里，读写都带上。投递 id 是 uuid、调用方也都校验过归属，
   * 但这条路径有三个入口（在线发信、定时重试、人工重试），少一个入口漏带
   * 就是跨租户改记录——让约束长在查询上，不长在「调用方记得校验」上。
   */
  const delivery = await prisma.mailDelivery.findFirst({
    where: withTenantScope(tenantId, { id: deliveryId }),
  });
  if (!delivery) {
    throw new AppError({ code: "mailer.delivery_not_found", status: 404 });
  }

  const transport = await buildTransport(resolved, log);
  const attempt = delivery.attempt_count + 1;

  try {
    const result = await transport.send({
      from: resolved.from,
      to: delivery.to_email,
      subject: delivery.subject,
      html: delivery.html,
      text: delivery.text,
      headers: (delivery.headers as Record<string, string> | null) ?? undefined,
    });
    await prisma.mailDelivery.updateMany({
      where: withTenantScope(tenantId, { id: delivery.id }),
      data: {
        status: "sent",
        driver: transport.id,
        attempt_count: attempt,
        provider_message_id: result.message_id,
        sent_at: new Date(),
        last_error: null,
        next_attempt_at: null,
      },
    });
    return { delivery_id: delivery.id, status: "sent" };
  } catch (err) {
    const retriable = isRetriableError(err) && attempt < MAX_ATTEMPTS;
    const message = transportErrorMessage(err);
    await prisma.mailDelivery.updateMany({
      where: withTenantScope(tenantId, { id: delivery.id }),
      data: {
        status: retriable ? "queued" : "failed",
        driver: transport.id,
        attempt_count: attempt,
        last_error: message.slice(0, 1000),
        next_attempt_at: retriable
          ? new Date(Date.now() + BACKOFF_MS[attempt - 1])
          : null,
      },
    });
    log.warn(
      { deliveryId: delivery.id, attempt, retriable, err: message },
      "[mailer] 投递失败",
    );
    /*
     * 还能重试就当作「已收下」返回，不把异常抛回调用方——摘要投递有几千个收件人，
     * 一个中继抖动不该让整轮任务炸掉。彻底失败才抛。
     */
    if (retriable) return { delivery_id: delivery.id, status: "queued" };
    throw new AppError({ code: "mailer.send_failed", status: 502 });
  }
}

/**
 * 重试到期的投递。由 `mailer-retry` 定时任务驱动。
 *
 * 逐租户解析配置：不同租户可能配了不同通道，一轮里不能共用一个 transport。
 * 排队期间租户把配置清空了就落 `dropped`——让它永远排在队里没有意义。
 */
export async function retryDueDeliveries(
  log: FastifyBaseLogger,
  limit = 100,
): Promise<{ retried: number; dropped: number }> {
  // eslint-disable-next-line tenant-scope/require-tenant-scope -- 后台任务服务全部租户，本就该跨租户扫；取到后逐行按 row.tenant_id 收窄
  const due = await prisma.mailDelivery.findMany({
    where: { status: "queued", next_attempt_at: { lte: new Date() } },
    orderBy: { next_attempt_at: "asc" },
    take: limit,
    select: { id: true, tenant_id: true },
  });

  let retried = 0;
  let dropped = 0;
  const configCache = new Map<string, ResolvedMailConfig>();

  for (const row of due) {
    let resolved = configCache.get(row.tenant_id);
    if (!resolved) {
      resolved = await resolveMailConfig(row.tenant_id);
      configCache.set(row.tenant_id, resolved);
    }
    if (!isUsable(resolved)) {
      await prisma.mailDelivery.updateMany({
        where: withTenantScope(row.tenant_id, { id: row.id }),
        data: {
          status: "dropped",
          next_attempt_at: null,
          last_error: "mailer.not_configured",
        },
      });
      dropped += 1;
      continue;
    }
    try {
      await attemptDelivery(row.tenant_id, row.id, resolved, log);
      retried += 1;
    } catch {
      // attemptDelivery 已经把状态与错误写进记录了，这里不再重复上报
      retried += 1;
    }
  }

  return { retried, dropped };
}

/** 人工重试：清掉退避时间立刻再发一次，复用同一个幂等键与正文。 */
export async function retryDeliveryNow(
  tenantId: string,
  deliveryId: string,
  log: FastifyBaseLogger,
): Promise<MailSendResult> {
  const delivery = await prisma.mailDelivery.findFirst({
    where: { id: deliveryId, tenant_id: tenantId },
    select: { id: true },
  });
  if (!delivery) {
    throw new AppError({ code: "mailer.delivery_not_found", status: 404 });
  }
  const resolved = await resolveMailConfig(tenantId);
  if (!isUsable(resolved)) {
    throw new AppError({ code: "mailer.not_configured", status: 503 });
  }
  return attemptDelivery(tenantId, delivery.id, resolved, log);
}

export async function isMailConfigured(tenantId: string): Promise<boolean> {
  return isUsable(await resolveMailConfig(tenantId));
}
