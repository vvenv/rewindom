/**
 * SMTP 驱动（nodemailer）。任何服务商与自建中继都能接，所以先做这个。
 *
 * transporter 按配置缓存：每封信都重建连接池会让每次发信都多一次 TLS 握手，
 * 批量摘要投递时这笔开销是按订阅者数量乘的。缓存键取全部连接参数，
 * 租户改了配置自然落到新键上，不需要手工失效。
 */
import {
  createTransport as createNodemailerTransport,
  type Transporter,
} from "nodemailer";

import type { MailTransport, MailTransportInput } from "./driver.js";
import type { ResolvedMailConfig } from "../mailer.config.js";

const pool = new Map<string, Transporter>();

function cacheKey(resolved: ResolvedMailConfig): string {
  const { host, port, secure, user, password } = resolved.smtp;
  return [host, port, secure, user, password].join(" ");
}

export function createSmtpTransport(
  resolved: ResolvedMailConfig,
): MailTransport {
  const key = cacheKey(resolved);
  let transporter = pool.get(key);
  if (!transporter) {
    transporter = createNodemailerTransport({
      host: resolved.smtp.host,
      port: resolved.smtp.port,
      // 465 是隐式 TLS；587 走 STARTTLS，此处必须为 false，否则握手直接挂
      secure: resolved.smtp.secure,
      // 内网中继常常是匿名的，没有用户名就不要带 auth 字段
      auth: resolved.smtp.user
        ? { user: resolved.smtp.user, pass: resolved.smtp.password }
        : undefined,
      pool: true,
    });
    pool.set(key, transporter);
  }

  return {
    id: "smtp",
    async send(input: MailTransportInput) {
      const info = await transporter.sendMail({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: input.headers,
      });
      return { message_id: info.messageId ?? null };
    },
  };
}

/** 进程退出时收掉连接池，别让 SMTP 连接吊着挡住优雅停机。 */
export function closeSmtpTransports(): void {
  for (const transporter of pool.values()) transporter.close();
  pool.clear();
}
