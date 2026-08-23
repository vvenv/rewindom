/**
 * Resend 原生 driver（HTTP API）。
 *
 * **为什么在 SMTP 之外还要它**：Resend 也提供 SMTP 中继，用 SMTP driver 就能把信发出去。
 * 但 SMTP 是「交出去就结束」的协议——信被拒了、进了垃圾箱、用户点了举报，我们一概
 * 不知道，投递记录会一直显示「已发出」，而真实送达率在悄悄下滑。原生 API 配上
 * webhook 才拿得到退信与投诉（见 `webhook.routes.ts`）。
 *
 * 不用官方 SDK：这里只调一个接口，多一个依赖不值当，而且自己发请求才能把
 * HTTP 状态码原样带进错误分级（`isRetriableError`）。
 */
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";

import type { MailTransport, MailTransportInput } from "./driver.js";
import type { ResolvedMailConfig } from "../mailer.config.js";

const ENDPOINT = "https://api.resend.com/emails";
/** 单封发送不该等太久：摘要投递是逐个收件人串行的，一次卡住会拖垮整轮。 */
const TIMEOUT_MS = 15_000;

interface ResendResponse {
  id?: string;
  message?: string;
  name?: string;
}

/**
 * 把 HTTP 状态码挂到错误上，`isRetriableError` 据此判可否重试。
 *
 * 422（域名未验证）是最常见的那一个，而它**永远不该重试**——重试一百次也还是没验证。
 */
function httpError(status: number, body: ResendResponse): AppError {
  const error = new AppError({
    code: "mailer.send_failed",
    status: 502,
    message: body.message ?? body.name ?? `Resend responded ${status}`,
  });
  (error as unknown as { statusCode: number }).statusCode = status;
  return error;
}

export function createResendTransport(
  resolved: ResolvedMailConfig,
): MailTransport {
  // API key 与 SMTP 密码共用 secret 列，见 mailer.config.ts 的 isUsable 注释
  const apiKey = resolved.smtp.password.trim();

  return {
    id: "resend",
    async send(input: MailTransportInput) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: input.from,
            to: [input.to],
            subject: input.subject,
            html: input.html,
            text: input.text,
            // List-Unsubscribe 这类必须原样落到信头上
            headers: input.headers,
          }),
          signal: controller.signal,
        });

        const body = (await response
          .json()
          .catch(() => ({}))) as ResendResponse;
        if (!response.ok) throw httpError(response.status, body);

        return { message_id: body.id ?? null };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
