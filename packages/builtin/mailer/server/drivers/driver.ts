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
 * 判据用 SMTP 响应码：5xx 是永久失败，4xx 是临时失败，没有响应码的一律当连接级。
 */
export function isRetriableError(err: unknown): boolean {
  const code = (err as { responseCode?: number })?.responseCode;
  if (typeof code === "number") return code < 500;
  return true;
}

export function transportErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
