/**
 * 客户端 IP 的唯一真相源。
 *
 * 全仓任何要「记下」或「据此判断」客户端 IP 的地方——审计日志、错误日志、
 * 公开接口限流、后续的 IP 封禁——都必须走这里，不要直接读 `request.ip`。
 *
 * 两个原因：
 *
 * 1. **可信度**。`request.ip` 的取值受 Fastify `trustProxy` 支配（见
 *    `config.server.trustedProxies`）。曾经是 `trustProxy: true`，即无条件采信
 *    `X-Forwarded-For` 最左值——任何人加一行请求头就能伪造自己的 IP。
 *
 * 2. **归一化**。Node 在双栈监听下把 IPv4 连接报成 IPv4-mapped IPv6
 *    （`::ffff:1.2.3.4`），而经代理传来的 XFF 里是裸 `1.2.3.4`。同一个客户端
 *    写进库就是两条记录、限流拿到两个桶、封禁名单里封了一条另一条照样进来。
 */
import { isIP } from "node:net";

const IPV4_MAPPED_RE = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * 把任意来源的地址串归一化成规范形式；无法识别为 IP 时返回 null。
 *
 * 处理方括号字面量（`[::1]:443`）、IPv4 端口后缀（`1.2.3.4:5678`）、
 * IPv4-mapped IPv6，并把 IPv6 统一成小写。
 */
export function normalizeIp(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  let raw = value.trim();
  if (raw === "") return null;

  if (raw.startsWith("[")) {
    // `[::1]` / `[::1]:443`
    const end = raw.indexOf("]");
    if (end === -1) return null;
    raw = raw.slice(1, end);
  } else if (raw.split(":").length === 2) {
    // 恰好一个冒号 = IPv4 带端口；IPv6 至少两个冒号，不会误伤
    raw = raw.slice(0, raw.indexOf(":"));
  }

  const mapped = IPV4_MAPPED_RE.exec(raw);
  if (mapped?.[1] !== undefined && isIP(mapped[1]) === 4) {
    return mapped[1];
  }

  const version = isIP(raw);
  if (version === 4) return raw;
  if (version === 6) return raw.toLowerCase();
  return null;
}

/**
 * 取本次请求的客户端 IP。
 *
 * 返回 null 表示拿不到可信地址（单元测试的假 request、内部调用等）。
 * 调用方要显式处理 null，**不要**回退成固定字符串——那会把一群拿不到 IP 的
 * 请求塞进同一个限流桶或同一条封禁规则。
 */
export function getClientIp(request: { ip?: string | undefined }): string | null {
  return normalizeIp(request.ip);
}
