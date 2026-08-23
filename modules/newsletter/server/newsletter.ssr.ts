/**
 * 确认 / 退订页（SSR，走站点模板页）。
 *
 * **副作用只发生在 POST。** GET 只渲染一个带 token 的表单。原因是邮件客户端和企业
 * 安全网关会替用户「预取」邮件里的链接——GET 就落确认的话，扫描器点一遍等于用户
 * 确认了；退订更糟，Gmail 的图片代理能把整个名单退光。
 *
 * **无 JS 也要能用。** 两张页都是真 `<form method="post">`。订阅入口可以依赖 JS
 * （enhance 脚本），退订不行——读者退不掉订阅就只能点「举报垃圾邮件」，
 * 那会烧掉整个发信域的声誉。
 *
 * **站点没发布 / 版式没落库也要能打开**：`requireSite: false` + 预设兜底。
 * 退订不能因为站长把官网下线、或还没点过「初始化版式」就失效。
 */
import { maskEmail } from "./subscriber-query.service.js";
import { resolveSiteOrigin } from "./site-origin.js";
import { createNewsletterPresetTranslator } from "./preset-i18n.js";
import {
  confirmSubscription,
  findByUnsubscribeToken,
  unsubscribe,
} from "./subscriber.service.js";

import { newsletterContextEntry } from "../shared/newsletter-section-context.js";
import {
  NEWSLETTER_CONFIRM_PATH,
  NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
  NEWSLETTER_SUBSCRIBE_PATH,
  NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET,
  NEWSLETTER_UNSUBSCRIBE_PATH,
  NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
} from "../shared/newsletter-page-templates.js";
import { NEWSLETTER_CONFIRM_PAGE_KIND } from "../shared/sections/confirm/definition.js";
import { NEWSLETTER_SUBSCRIBE_PAGE_KIND } from "../shared/sections/subscribe/definition.js";
import { NEWSLETTER_UNSUBSCRIBE_PAGE_KIND } from "../shared/sections/unsubscribe/definition.js";

import { resolvePageContributed } from "@rewindom/builtin/marketing/server/page-contributed.js";
import { cookiesFromHeader } from "@rewindom/builtin/marketing/server/section-context-providers.js";
import { resolveSiteAccountEntry } from "@rewindom/builtin/marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "@rewindom/builtin/marketing/server/site-entitlements.js";
import {
  getPublishedTemplatePage,
  getSiteChromeOrFallback,
  resolveVisitorHomePath,
} from "@rewindom/builtin/marketing/server/site.service.js";
import {
  renderMarketingHtml,
  siteLocaleAlternates,
} from "@rewindom/builtin/marketing/server/ssr-render.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";
import { parseMarketingSsrPath } from "@rewindom/builtin/marketing/shared/site-locale.js";
import {
  defineRoute,
  normalizeLocale,
  requestOriginFromHeaders,
  resolveHostTenant,
  resolveRequestHostname,
} from "@rewindom/module-sdk/server";

import type { NewsletterRenderContext } from "../shared/newsletter-section-context.js";
import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export {
  NEWSLETTER_CONFIRM_PATH,
  NEWSLETTER_SUBSCRIBE_PATH,
  NEWSLETTER_UNSUBSCRIBE_PATH,
};

interface PageSpec {
  kind: string;
  path: string;
  preset: PagePreset;
}

/**
 * 订阅页。
 *
 * 与另外两张的区别：它**没有按请求状态**——订阅段只是一个表单，提交由 enhance
 * 脚本接管。所以上下文传空对象，走的仍是同一套「模板页 + 预设兜底」渲染。
 */
const SUBSCRIBE_SPEC: PageSpec = {
  kind: NEWSLETTER_SUBSCRIBE_PAGE_KIND,
  path: NEWSLETTER_SUBSCRIBE_PATH,
  preset: NEWSLETTER_SUBSCRIBE_TEMPLATE_PRESET,
};

const CONFIRM_SPEC: PageSpec = {
  kind: NEWSLETTER_CONFIRM_PAGE_KIND,
  path: NEWSLETTER_CONFIRM_PATH,
  preset: NEWSLETTER_CONFIRM_TEMPLATE_PRESET,
};

const UNSUBSCRIBE_SPEC: PageSpec = {
  kind: NEWSLETTER_UNSUBSCRIBE_PAGE_KIND,
  path: NEWSLETTER_UNSUBSCRIBE_PATH,
  preset: NEWSLETTER_UNSUBSCRIBE_TEMPLATE_PRESET,
};

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

/**
 * 自己解析绑定的站点。
 *
 * `hostTenantContext` **只在 `/api*` 上**由 auth 中间件填（见 `auth.middleware.ts`），
 * 而这三张是挂在根路径上的**页面**。不解析的话它们在任何域名上都只回
 * `site.host_unbound`——与 shop 店面路由、marketing SSR 的同名函数一条口径。
 */
async function ensureHostTenant(request: FastifyRequest): Promise<void> {
  if (request.hostTenantContext !== undefined) return;
  request.hostTenantContext = await resolveHostTenant(
    resolveRequestHostname(request.headers),
  );
}

/** 把模板页（或兜底预设）+ 按请求上下文渲染成整页 HTML。 */
async function renderPanelPage(
  request: FastifyRequest,
  reply: FastifyReply,
  spec: PageSpec,
  /**
   * 本模块自己的按请求状态。订阅页留空：页面上摆着订阅段，文案表与 `?list=` 范围
   * 由本模块登记的 provider 算（`register.ts`），路由再算一遍只会让两条路径慢慢漂。
   */
  own: NewsletterRenderContext = {},
): Promise<FastifyReply> {
  await ensureHostTenant(request);
  const hostTenant = request.hostTenantContext;
  if (!hostTenant) {
    return reply.status(404).send({ code: "site.host_unbound" });
  }

  const requested = parseMarketingSsrPath(request.url).locale;
  const site = await getSiteChromeOrFallback(
    hostTenant.tenant_id,
    hostTenant.tenant_slug,
    hostTenant.tenant_slug,
    requested,
  );
  const locale = normalizeLocale(requested, site.default_locale);

  const stored = await getPublishedTemplatePage(
    hostTenant.tenant_id,
    spec.kind,
    locale,
    // 站点没发布时也要能确认 / 退订，那时用兜底版式
    { requireSite: false },
  );
  const translate = createNewsletterPresetTranslator(locale);
  const template = stored ?? {
    sections: buildPresetSections(spec.preset, translate),
    title: translate(spec.preset.titleKey ?? ""),
    description: translate(spec.preset.descriptionKey ?? ""),
  };

  /*
   * 页头的账户入口（登录链 / 已登录菜单）由 marketing 解析后注入——`chrome_account`
   * 块渲染的就是这段 HTML，不传等于把它渲染成空：页头上摆了账户入口的站点，一切到
   * 这三张页那个按钮就凭空消失。所有走 SSR 的贡献页（events / shop / site-docs /
   * site-billing）都传这一项。
   */
  const [accountEntry, entitlements] = await Promise.all([
    resolveSiteAccountEntry({ tenantId: hostTenant.tenant_id, locale }),
    resolveSectionEntitlements(hostTenant.tenant_id),
  ]);
  /*
   * 贡献段按 home mount 拼站内链接（事件枢纽当首页时详情落在 `/:slug`）。这三张页的
   * path 都不是 `/`，`resolveVisitorHomePath` 只会回当前挂载点，不改写路径。
   */
  const home = await resolveVisitorHomePath({
    tenantId: hostTenant.tenant_id,
    path: spec.path,
    entitlements,
  });
  /*
   * 页头页脚上的贡献块要的数据与 CMS 页同一条口径（见 `page-contributed.ts`）。
   * **不跳过订阅段**：那份文案表与 `?list=` 范围以本模块登记的 provider 为唯一来源，
   * 路由再算一遍只会让两条路径慢慢漂。
   */
  const contributed = await resolvePageContributed({
    tenantId: hostTenant.tenant_id,
    locale,
    defaultLocale: site.default_locale,
    site,
    sections: template.sections,
    own: newsletterContextEntry(own),
    cookies: cookiesFromHeader(request.headers.cookie),
    query: request.query as Record<string, unknown>,
    homePath: home.homePath,
    homeLayoutKey: home.homeLayoutKey,
  });
  /*
   * 请求头拿不到 origin（代理没透传 Host 之类）时回落到按租户解析的站点地址——
   * 这两张页的 canonical / og 都靠它，空着会让整页的绝对地址全错。
   */
  const origin =
    requestOriginFromHeaders(request) ??
    (await resolveSiteOrigin(hostTenant.tenant_id));

  return reply.type("text/html; charset=utf-8").send(
    renderMarketingHtml({
      origin,
      tenant_id: hostTenant.tenant_id,
      tenant_slug: hostTenant.tenant_slug,
      site,
      page: {
        slug: spec.path,
        locale,
        kind: spec.kind,
        title: template.title,
        description: template.description,
        sections: template.sections,
        // 事务页不该被收录：对搜索引擎没有内容，收进去只会分走真正内容的权重
        settings: { noindex: true },
        visibility: "public",
        path: spec.path,
        alternates: siteLocaleAlternates(spec.path, site, request.url),
        updated_at: new Date().toISOString(),
      },
      accountEntryHtml: accountEntry.html,
      enabledEntitlements: entitlements,
      contributed,
    }),
  );
}

export async function newsletterSsrRoutes(app: FastifyInstance): Promise<void> {
  defineRoute(app, {
    method: "GET",
    url: NEWSLETTER_SUBSCRIBE_PATH,
    context: "NewsletterSubscribePage",
    errorCode: "NEWSLETTER_SUBSCRIBE_PAGE_FAILED",
    handler: async (request, reply) =>
      renderPanelPage(request, reply, SUBSCRIBE_SPEC),
  });

  defineRoute(app, {
    method: "GET",
    url: NEWSLETTER_CONFIRM_PATH,
    context: "NewsletterConfirmPage",
    errorCode: "NEWSLETTER_CONFIRM_PAGE_FAILED",
    handler: async (request, reply) => {
      const token = queryToken(request);
      return renderPanelPage(request, reply, CONFIRM_SPEC, {
        confirm: {
          // 没有 token 的裸访问直接给失效态，不出一个点了没反应的按钮
          result: token ? "form" : "invalid",
          token,
          action: NEWSLETTER_CONFIRM_PATH,
        },
      });
    },
  });

  defineRoute(app, {
    method: "POST",
    url: NEWSLETTER_CONFIRM_PATH,
    context: "NewsletterConfirm",
    errorCode: "NEWSLETTER_CONFIRM_FAILED",
    handler: async (request, reply) => {
      if (!sameOrigin(request)) {
        return reply.status(403).send({ code: "site.form_origin_invalid" });
      }
      await ensureHostTenant(request);
      const hostTenant = request.hostTenantContext;
      const token = bodyField(request, "token")[0] ?? "";
      const ok =
        hostTenant && token
          ? await confirmSubscription(hostTenant.tenant_id, token)
          : false;

      return renderPanelPage(request, reply, CONFIRM_SPEC, {
        // 失效与不存在给同一个状态：不透露某个 token 是否真的存在过
        confirm: {
          result: ok ? "ok" : "invalid",
          token,
          action: NEWSLETTER_CONFIRM_PATH,
        },
      });
    },
  });

  defineRoute(app, {
    method: "GET",
    url: NEWSLETTER_UNSUBSCRIBE_PATH,
    context: "NewsletterUnsubscribePage",
    errorCode: "NEWSLETTER_UNSUBSCRIBE_PAGE_FAILED",
    handler: async (request, reply) => {
      const token = queryToken(request);
      const found = token ? await findByUnsubscribeToken(token) : null;

      return renderPanelPage(request, reply, UNSUBSCRIBE_SPEC, {
        unsubscribe: {
          result: found ? "form" : "invalid",
          token,
          action: NEWSLETTER_UNSUBSCRIBE_PATH,
          // 掩码：这张页面不需要登录就能打开，不该把完整地址回显出去
          email: found ? maskEmail(found.target.email) : "",
          lists: found?.target.lists ?? [],
        },
      });
    },
  });

  defineRoute(app, {
    method: "POST",
    url: NEWSLETTER_UNSUBSCRIBE_PATH,
    context: "NewsletterUnsubscribe",
    errorCode: "NEWSLETTER_UNSUBSCRIBE_FAILED",
    handler: async (request, reply) => {
      const token = bodyField(request, "token")[0] ?? queryToken(request);
      const listKeys = bodyField(request, "list_keys");
      const ok = token ? await unsubscribe(token, listKeys) : false;

      return renderPanelPage(request, reply, UNSUBSCRIBE_SPEC, {
        unsubscribe: {
          result: ok ? "ok" : "invalid",
          token,
          action: NEWSLETTER_UNSUBSCRIBE_PATH,
          email: "",
          lists: [],
        },
      });
    },
  });
}
