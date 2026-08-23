/**
 * 确认 / 退订页（SSR）。
 *
 * **副作用只发生在 POST。** GET 只渲染一个带 token 的表单。原因是邮件客户端和企业
 * 安全网关会替用户「预取」邮件里的链接——GET 就落确认的话，扫描器点一遍等于用户
 * 确认了；退订更糟，Gmail 的图片代理能把整个名单退光。
 *
 * **无 JS 也要能用。** 两张页都是真 `<form method="post">`，走 POST-重定向-GET。
 * 订阅入口可以依赖 JS（enhance 脚本），退订不行——读者退不掉订阅就只能点
 * 「举报垃圾邮件」，那会烧掉整个发信域的声誉。
 *
 * 这两张页**不做成可排版的模板页**（site-member 的登录/注册是那么做的）：那是读者会
 * 反复到访的目的地，值得让站长排版；确认链接一辈子只点一次。做成模板页要引入
 * page kind、preset、编辑器段与初始化按钮一整套，收益不成比例。记在 spec 的 out_of_scope。
 */
import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";

import {
  confirmSubscription,
  findByUnsubscribeToken,
  unsubscribe,
} from "./subscriber.service.js";

import { defineRoute } from "@rewindom/module-sdk/server";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export const NEWSLETTER_CONFIRM_PATH = "/newsletter/confirm";
export const NEWSLETTER_UNSUBSCRIBE_PATH = "/newsletter/unsubscribe";

const isZh = (locale: string): boolean => locale.toLowerCase().startsWith("zh");

/**
 * 极简独立页。刻意不套站点 chrome：这两张页在站点没发布时也必须打得开
 * ——退订不能因为站长把官网下线了就失效。
 */
function page(input: { title: string; body: string; locale: string }): string {
  return [
    `<!doctype html>`,
    `<html lang="${escapeHtml(input.locale)}">`,
    `<head>`,
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width,initial-scale=1" />`,
    // 事务页不该进搜索索引
    `<meta name="robots" content="noindex,nofollow" />`,
    `<title>${escapeHtml(input.title)}</title>`,
    `<style>`,
    `:root{color-scheme:light dark}`,
    `body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:Canvas;color:CanvasText}`,
    `main{max-width:32rem;width:100%}`,
    `h1{font-size:1.375rem;margin:0 0 .5rem}`,
    `p{margin:.5rem 0}`,
    `ul{margin:.5rem 0;padding-left:1.25rem}`,
    `button{font:inherit;padding:.625rem 1.125rem;border:0;border-radius:6px;background:CanvasText;color:Canvas;cursor:pointer}`,
    `.muted{opacity:.7;font-size:.875rem}`,
    `</style>`,
    `</head>`,
    `<body><main>${input.body}</main></body></html>`,
  ].join("");
}

function reply200(reply: FastifyReply, html: string): FastifyReply {
  return reply.type("text/html; charset=utf-8").send(html);
}

function queryToken(request: FastifyRequest): string {
  const { token } = request.query as { token?: string };
  return typeof token === "string" ? token.trim() : "";
}

function bodyField(request: FastifyRequest, key: string): string[] {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const value = body[key];
  if (Array.isArray(value)) return value.map(String);
  return typeof value === "string" && value ? [value] : [];
}

function localeOf(request: FastifyRequest): string {
  const header = request.headers["accept-language"];
  return typeof header === "string" && /zh/iu.test(header) ? "zh-CN" : "en";
}

/**
 * 同源校验。**只给确认页用**。
 *
 * 退订**刻意不校验**：`List-Unsubscribe-Post` 的一键退订是邮件服务商（Gmail 等）
 * 的服务器发来的 POST，没有我们的 Origin。token 本身就是凭证（32 字节随机量），
 * 而且退订是「宁可多退，不可退不掉」的操作——把它挡在同源检查后面是本末倒置。
 */
function sameOrigin(request: FastifyRequest): boolean {
  const origin = request.headers.origin;
  if (!origin) return true; // 无 JS 的普通表单提交有些浏览器不带 Origin
  const host = request.headers.host;
  return Boolean(host) && origin.endsWith(`//${host}`);
}

export async function newsletterSsrRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: NEWSLETTER_CONFIRM_PATH,
    context: "NewsletterConfirmPage",
    errorCode: "NEWSLETTER_CONFIRM_PAGE_FAILED",
    handler: async (request, reply) => {
      const locale = localeOf(request);
      const zh = isZh(locale);
      const token = queryToken(request);
      const title = zh ? "确认订阅" : "Confirm subscription";
      if (!token) {
        return reply200(
          reply,
          page({
            title,
            locale,
            body: `<h1>${title}</h1><p>${zh ? "这个链接不完整。" : "This link is incomplete."}</p>`,
          }),
        );
      }
      return reply200(
        reply,
        page({
          title,
          locale,
          body: [
            `<h1>${title}</h1>`,
            `<p>${zh ? "点下面的按钮完成订阅。" : "Press the button to finish subscribing."}</p>`,
            `<form method="post" action="${NEWSLETTER_CONFIRM_PATH}">`,
            `<input type="hidden" name="token" value="${escapeHtml(token)}" />`,
            `<button type="submit">${zh ? "确认订阅" : "Confirm"}</button>`,
            `</form>`,
          ].join(""),
        }),
      );
    },
  });

  defineRoute(app, {
    method: "POST",
    url: NEWSLETTER_CONFIRM_PATH,
    context: "NewsletterConfirm",
    errorCode: "NEWSLETTER_CONFIRM_FAILED",
    handler: async (request, reply) => {
      const locale = localeOf(request);
      const zh = isZh(locale);
      const title = zh ? "确认订阅" : "Confirm subscription";
      if (!sameOrigin(request)) {
        return reply.status(403).send({ error: "origin mismatch" });
      }
      const hostTenant = request.hostTenantContext;
      const token = bodyField(request, "token")[0] ?? "";
      const ok =
        hostTenant && token
          ? await confirmSubscription(hostTenant.tenant_id, token)
          : false;

      return reply200(
        reply,
        page({
          title,
          locale,
          body: ok
            ? `<h1>${zh ? "订阅完成" : "You're subscribed"}</h1><p>${zh ? "之后的新进展会按你选的周期发到这个邮箱。" : "New items will arrive on the schedule you picked."}</p>`
            : // 失效与不存在给同一句话：不透露某个 token 是否真的存在过
              `<h1>${title}</h1><p>${zh ? "这个确认链接已失效，请重新订阅。" : "This confirmation link is no longer valid. Please subscribe again."}</p>`,
        }),
      );
    },
  });

  defineRoute(app, {
    method: "GET",
    url: NEWSLETTER_UNSUBSCRIBE_PATH,
    context: "NewsletterUnsubscribePage",
    errorCode: "NEWSLETTER_UNSUBSCRIBE_PAGE_FAILED",
    handler: async (request, reply) => {
      const locale = localeOf(request);
      const zh = isZh(locale);
      const title = zh ? "取消订阅" : "Unsubscribe";
      const token = queryToken(request);
      const found = token ? await findByUnsubscribeToken(token) : null;

      if (!found) {
        return reply200(
          reply,
          page({
            title,
            locale,
            body: `<h1>${title}</h1><p>${zh ? "这个链接已失效，或者你已经退订了。" : "This link is no longer valid, or you have already unsubscribed."}</p>`,
          }),
        );
      }

      const lists = found.target.lists;
      const checkboxes = lists
        .map(
          (listKey) =>
            `<li><label><input type="checkbox" name="list_keys" value="${escapeHtml(listKey)}" /> ${escapeHtml(listKey)}</label></li>`,
        )
        .join("");

      return reply200(
        reply,
        page({
          title,
          locale,
          body: [
            `<h1>${title}</h1>`,
            `<p>${zh ? "这个邮箱" : "This address"}（${escapeHtml(found.target.email)}）${zh ? "订阅了：" : "is subscribed to:"}</p>`,
            `<form method="post" action="${NEWSLETTER_UNSUBSCRIBE_PATH}">`,
            `<input type="hidden" name="token" value="${escapeHtml(token)}" />`,
            lists.length > 1 ? `<ul>${checkboxes}</ul>` : "",
            /*
             * 「全部退订」始终是**默认且最显眼**的那颗：读者点退订链接的意图九成是
             * 「别再发了」。挑着退是次要路径，勾了才走。
             */
            `<p><button type="submit">${zh ? "全部退订" : "Unsubscribe from all"}</button></p>`,
            lists.length > 1
              ? `<p class="muted">${zh ? "勾选上面某几项则只退这几项。" : "Tick items above to unsubscribe from just those."}</p>`
              : "",
            `</form>`,
          ]
            .filter(Boolean)
            .join(""),
        }),
      );
    },
  });

  defineRoute(app, {
    method: "POST",
    url: NEWSLETTER_UNSUBSCRIBE_PATH,
    context: "NewsletterUnsubscribe",
    errorCode: "NEWSLETTER_UNSUBSCRIBE_FAILED",
    handler: async (request, reply) => {
      const locale = localeOf(request);
      const zh = isZh(locale);
      const title = zh ? "取消订阅" : "Unsubscribe";
      const token = bodyField(request, "token")[0] ?? queryToken(request);
      const listKeys = bodyField(request, "list_keys");
      const ok = token ? await unsubscribe(token, listKeys) : false;

      return reply200(
        reply,
        page({
          title,
          locale,
          body: ok
            ? `<h1>${zh ? "已退订" : "Unsubscribed"}</h1><p>${zh ? "不会再给这个邮箱发信了。" : "We won't email this address again."}</p>`
            : `<h1>${title}</h1><p>${zh ? "这个链接已失效，或者你已经退订了。" : "This link is no longer valid, or you have already unsubscribed."}</p>`,
        }),
      );
    },
  });
}
