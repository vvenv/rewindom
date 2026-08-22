/**
 * `log` 驱动：把邮件全文写进日志，不出网。
 *
 * 这是**开发环境唯一真正零配置可用**的通道。不做「从服务器裸连收件方 MX 直投」
 * 那种所谓免费兜底：云厂商基本封 25 端口，没有 SPF/DKIM 的信一律进垃圾箱，
 * 等于白发，还会把域名声誉一起烧掉。
 *
 * 生产禁用由 `buildMailConfig` 与 `parseDriver` 两处闸门挡着——在生产用它，
 * 等于所有确认信、退订信静默消失，而设置页仍显示「已配置」。
 */
import type { MailTransport, MailTransportInput } from "./driver.js";
import type { FastifyBaseLogger } from "fastify";

export function createLogTransport(log: FastifyBaseLogger): MailTransport {
  return {
    id: "log",
    async send(input: MailTransportInput) {
      log.info(
        {
          to: input.to,
          from: input.from,
          subject: input.subject,
          headers: input.headers,
          text: input.text,
        },
        "[mailer] log driver：邮件未真正发出",
      );
      return { message_id: null };
    },
  };
}
