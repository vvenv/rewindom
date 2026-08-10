/**
 * 会员 SSR 页面（登录 / 注册 / 我的账户）共用的请求处理零件。
 *
 * 这几页是同一条链路上的三张页面：同样按 Host 判租户、同样吐 `no-store` 的 HTML、
 * 同样只认同源的表单 POST。各写一遍的结果是**安全口径**慢慢分叉——CSRF 那道闸门在
 * 三个文件里各有一份，改对两处漏掉一处不会有任何测试变红。
 */

import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import {
  resolveHostTenant,
  resolveRequestHostname,
} from "@be-water/server-kernel/lib/host-tenant.js";
import { translateServerMessage } from "@be-water/server-kernel/lib/i18n/registry.js";
import { type AppLocale } from "@be-water/shared";

import type { FastifyReply, FastifyRequest } from "fastify";

/** 登录后回哪儿：只认站内相对路径（`//evil.com` 是一个协议相对的**站外**地址）。 */
export function safeRedirect(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  return raw;
}

export function requestOrigin(request: FastifyRequest): string {
  const proto =
    (request.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || "https";
  const host =
    resolveRequestHostname(request.headers) || request.hostname || "localhost";
  return `${proto}://${host}`;
}

export async function ensureHostTenant(request: FastifyRequest): Promise<void> {
  if (request.hostTenantContext !== undefined) return;
  request.hostTenantContext = await resolveHostTenant(
    resolveRequestHostname(request.headers),
  );
}

export function sendHtml(
  reply: FastifyReply,
  status: number,
  html: string,
): void {
  void reply
    .status(status)
    .header("content-type", "text/html; charset=utf-8")
    // 页面里有回填的邮箱、错误、以及因人而异的登录态——绝不能进任何共享缓存
    .header("cache-control", "private, no-store")
    .send(html);
}

/** `Origin` 头里的 hostname；缺失或不是合法 URL 都返回空串。 */
function originHostname(origin: string | undefined): string {
  if (!origin) return "";
  try {
    return new URL(origin).hostname;
  } catch {
    return "";
  }
}

/**
 * 表单 POST 的 CSRF 闸门。
 *
 * 会员 cookie 是 `SameSite=lax`，读操作拦得住，但**登录本身**没有 cookie 可拦：
 * 攻击者从自己的页面 POST 过来，就能把访客登进攻击者的账号（login CSRF），之后
 * 访客在「自己的」账号里做的事全落在对方账号下。账户页那三张表单同理：跨站 POST
 * 一个 `intent=password` 过来就是替人改密码。跨站表单 POST 一定带 `Origin`，
 * 同 Host 才放行；没有 `Origin` 的（极老的浏览器 / 非浏览器客户端）一并拒绝——
 * 那条路还有 `/api/member/*` 可走，不必在这里开口子。
 *
 * 只比 **hostname**，不比协议与端口：拦的是「别的站点发过来的」，而攻击者拿不到
 * 同一个 hostname。比全 origin 反而会在本地与反代后误伤——那时请求进程看到的协议
 * 常常是 http，浏览器发的 `Origin` 却是 https（`x-forwarded-proto` 缺失或不一致）。
 */
export function assertSameOrigin(request: FastifyRequest): void {
  const origin = request.headers.origin;
  const expected =
    resolveRequestHostname(request.headers) || request.hostname || "";
  const actual = originHostname(origin);
  if (!actual || !expected || actual !== expected) {
    throw new AppError({ code: "site_member.form_origin_invalid", status: 403 });
  }
}

/** 错误 → 访客语言下的一句话（卡片顶上那条红字）。 */
export function errorMessage(error: unknown, locale: AppLocale): string {
  const code =
    error instanceof AppError && error.code
      ? error.code
      : "common.internal_error";
  return translateServerMessage(locale, { code, message: code });
}

/**
 * 表单 body 是 `application/x-www-form-urlencoded`，Fastify 默认只认 JSON。
 *
 * 解析器登记在调用方那个封装作用域里，不影响其它路由；两处页面路由各自登记一次
 * （同一个 app 上重复登记同一种 content-type 会抛，所以不能在共享层直接挂）。
 */
export function formBodyParser(app: {
  addContentTypeParser: (
    type: string,
    options: { parseAs: "string" },
    handler: (
      request: FastifyRequest,
      body: unknown,
      done: (error: Error | null, result?: unknown) => void,
    ) => void,
  ) => void;
}): void {
  app.addContentTypeParser(
    "application/x-www-form-urlencoded",
    { parseAs: "string" },
    (_request, body, done) => {
      try {
        done(null, Object.fromEntries(new URLSearchParams(body as string)));
      } catch (error) {
        done(error as Error);
      }
    },
  );
}
