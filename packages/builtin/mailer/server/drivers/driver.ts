/**
 * 发信通道的驱动抽象。
 *
 * 驱动只负责「把这一封交出去」，不管幂等、不管重试、不管投递记录——那些是
 * `mail.service.ts` 的事。这样加一个 HTTP 通道（Resend / Brevo）只要多一个文件。
 */

export interface MailTransportInput {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface MailTransportResult {
  /** 通道给的消息号，用于对账；拿不到就 null。 */
  message_id: string | null;
}

export interface MailTransport {
  readonly id: string;
  send(input: MailTransportInput): Promise<MailTransportResult>;
}

/**
 * 连接级失败 vs 投递被拒 —— 两者的处置完全相反，必须分开。
 *
 * 连接级（连不上、认证失败、超时）：通道本身的问题，重试有意义。
 * 被拒（地址不存在、内容被判垃圾、超配额）：重试只会把发信域的声誉越烧越糟，
 * 应当直接判 failed 并让人来看。
 *
 * 两套判据，因为两种协议的语义正好相反：
 *
 * - **SMTP**（`responseCode`）：5xx 永久失败，4xx 临时失败 → `< 500` 可重试
 * - **HTTP**（`statusCode`）：5xx 与 429 可重试，其余 4xx 永久失败
 *
 * HTTP 的 422（域名未验证）尤其不能重试——重试一百次也还是没验证，
 * 只会把投递记录刷满，真正该做的是去把域名验了。
 *
 * 都拿不到就当连接级失败（连不上、超时），可重试。
 */
export function isRetriableError(err: unknown): boolean {
  const httpStatus = (err as { statusCode?: number })?.statusCode;
  if (typeof httpStatus === "number") {
    return httpStatus === 429 || httpStatus >= 500;
  }
  const smtpCode = (err as { responseCode?: number })?.responseCode;
  if (typeof smtpCode === "number") return smtpCode < 500;
  return true;
}

export function transportErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
