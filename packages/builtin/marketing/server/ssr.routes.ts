import {
  resolveHostTenant,
  resolveRequestHostname,
  requestOriginFromHeaders,
} from "@rewindom/server-kernel/lib/host-tenant.js";
import {
  DEFAULT_TENANT_ID,
  normalizeLocale,
  type AppLocale,
} from "@rewindom/shared";

import { collectSectionTypes } from "../shared/sections/collect-types.js";
import { isSpaShellPath, resolveLocaleSegment } from "../shared/site-locale.js";
import { matchSitePathHandler } from "../shared/site-path-handlers.js";

import {
  cookiesFromHeader,
  resolveSectionContexts,
} from "./section-context-providers.js";
import { resolveSiteAccountEntry } from "./site-account-entry.js";
import { resolveSectionEntitlements } from "./site-entitlements.js";
import { resolveSiteMemberSsrSession } from "./site-member-ssr-session.js";
import { findSiteRedirect } from "./site-redirect.service.js";
import {
  getPublishedPublicPage,
  getPublishedPublicSite,
  getPublishedSitemapEntries,
} from "./site.service.js";
import { resolveContributedSitemapEntries } from "./sitemap-providers.js";
import {
  renderMarketingHtml,
  renderRobotsTxt,
  renderSitemapXml,
  renderUnavailableHtml,
} from "./ssr-render.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** 自定义 404 页的约定 slug。 */
const NOT_FOUND_SLUG_PATH = "/404";

function requestOrigin(request: FastifyRequest): string {
  return requestOriginFromHeaders(request) ?? `http://${request.hostname}`;
}

async function ensureHostTenant(request: FastifyRequest): Promise<void> {
  if (request.hostTenantContext !== undefined) return;
  const hostname = resolveRequestHostname(request.headers);
  request.hostTenantContext = await resolveHostTenant(hostname);
}

function sendHtml(
  reply: FastifyReply,
  status: number,
  html: string,
  options?: { privateCache?: boolean },
): void {
  const cacheControl = options?.privateCache
    ? "private, no-store"
    : "public, max-age=60";
  void reply
    .status(status)
    .header("content-type", "text/html; charset=utf-8")
    .header("cache-control", cacheControl)
    .send(html);
}

function flattenQuery(query: unknown): Record<string, string> {
  if (!query || typeof query !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === "string") {
      out[key] = value[0];
    }
  }
  return out;
}

/**
 * 自定义 404：租户建一个 slug 为 `404` 的页面就是它，没有就用内置兜底页。
 *
 * 不另开一张表 / 一个 `kind`：它就是一张普通页面，租户用同一个编辑器排版、同一套发布
 * 流程上线，也能预览。约定一个 slug 比多一种「特殊页面」类型便宜得多。
 *
 * 状态码仍然是 **404**——渲染出内容不代表这个地址存在，返 200 会让搜索引擎把每个
 * 死链都当成一张真页面收录（俗称 soft 404）。
 */
async function renderNotFound(
  request: FastifyRequest,
  reply: FastifyReply,
  hostTenant: NonNullable<FastifyRequest["hostTenantContext"]>,
  locale: AppLocale | null,
): Promise<void> {
  const custom = await getPublishedPublicPage(
    hostTenant.tenant_id,
    NOT_FOUND_SLUG_PATH,
    hostTenant.tenant_slug,
    locale,
  );
  if (!custom) {
    sendHtml(
      reply,
      404,
      renderUnavailableHtml({
        title: "Page not found",
        message: "This page is not published or does not exist.",
      }),
    );
    return;
  }

  const pageLocale = normalizeLocale(
    custom.page.locale,
    custom.site.default_locale,
  );
  const usedSectionTypes = collectSectionTypes(custom.site.header);
  collectSectionTypes(custom.site.footer, usedSectionTypes);
  collectSectionTypes(custom.page.sections, usedSectionTypes);

  const [accountEntry, enabledEntitlements, contributed] = await Promise.all([
    resolveSiteAccountEntry({
      tenantId: hostTenant.tenant_id,
      locale: pageLocale,
    }),
    resolveSectionEntitlements(hostTenant.tenant_id),
    resolveSectionContexts({
      tenantId: hostTenant.tenant_id,
      locale: pageLocale,
      defaultLocale: custom.site.default_locale,
      usedSectionTypes,
      cookies: cookiesFromHeader(request.headers.cookie),
    }),
  ]);

  sendHtml(
    reply,
    404,
    renderMarketingHtml({
      origin: requestOrigin(request),
      site: custom.site,
      contributed,
      // 404 页不该被收录：它会出现在无数个不存在的地址上
      page: {
        ...custom.page,
        settings: { ...custom.page.settings, noindex: true },
      },
      accountEntryHtml: accountEntry.html,
      enabledEntitlements,
    }),
  );
}

async function renderPath(
  request: FastifyRequest,
  reply: FastifyReply,
  path: string,
  locale: AppLocale | null = null,
): Promise<void> {
  await ensureHostTenant(request);
  const hostTenant = request.hostTenantContext;
  if (!hostTenant) {
    sendHtml(
      reply,
      404,
      renderUnavailableHtml({
        title: "Site not found",
        message: "This host is not bound to a site.",
      }),
    );
    return;
  }

  /*
   * 贡献路径（文档库 `/docs` 等）在查 MarketingPage 之前问注册表。
   * 匹配的是去掉 locale 前缀后的逻辑路径，所以 `/en/docs` 与 `/docs` 同一条。
   */
  const enabledEntitlements = await resolveSectionEntitlements(
    hostTenant.tenant_id,
  );
  const handler = matchSitePathHandler(path, enabledEntitlements);
  if (handler) {
    const site = await getPublishedPublicSite(
      hostTenant.tenant_id,
      hostTenant.tenant_slug,
      locale,
    );
    const accountEntry = await resolveSiteAccountEntry({
      tenantId: hostTenant.tenant_id,
      locale: normalizeLocale(site?.default_locale, locale ?? undefined),
    });
    const html = await handler.render({
      tenantId: hostTenant.tenant_id,
      tenantSlug: hostTenant.tenant_slug,
      origin: requestOrigin(request),
      path,
      locale,
      enabledEntitlements,
      accountEntryHtml: accountEntry.html,
      cookies: cookiesFromHeader(request.headers.cookie),
      query: flattenQuery(request.query),
    });
    if (html === null) {
      await renderNotFound(request, reply, hostTenant, locale);
      return;
    }
    sendHtml(reply, 200, html);
    return;
  }

  const result = await getPublishedPublicPage(
    hostTenant.tenant_id,
    path,
    hostTenant.tenant_slug,
    locale,
  );
  if (!result) {
    /*
     * 顺序是刻意的：**先查真实页面，找不到才查重定向**。
     *
     * 反过来（重定向优先）的话，租户后来又建了一个同名页就永远打不开——而那种错很难
     * 联想到是几个月前加的一条重定向造成的。重定向本来就是给「曾经存在的路径」用的。
     */
    const redirect = await findSiteRedirect(hostTenant.tenant_id, path);
    if (redirect) {
      void reply
        .status(redirect.status_code)
        .header("location", redirect.to_path)
        // 301 会被浏览器长期缓存，别再让中间层多缓存一层：改规则时要能立刻生效
        .header("cache-control", "no-store")
        .send();
      return;
    }

    await renderNotFound(request, reply, hostTenant, locale);
    return;
  }

  const member = await resolveSiteMemberSsrSession({
    request,
    reply,
    tenantId: hostTenant.tenant_id,
  });

  const [accountEntry] = await Promise.all([
    resolveSiteAccountEntry({
      tenantId: hostTenant.tenant_id,
      locale: normalizeLocale(result.page.locale, result.site.default_locale),
      member,
    }),
  ]);

  /*
   * 这张页面（含页头页脚）到底摆了哪些段——贡献段的 provider 按它决定跑不跑
   *（见 section-context-providers.ts）。导航 source 也收进来，页头挂了
   * `site-docs` 但页面上没有文档段时，目录数据照样要查。
   */
  const usedSectionTypes = collectSectionTypes(result.site.header);
  collectSectionTypes(result.site.footer, usedSectionTypes);
  collectSectionTypes(result.page.sections, usedSectionTypes);

  const pageLocale = normalizeLocale(
    result.page.locale,
    result.site.default_locale,
  );

  const contributed = await resolveSectionContexts({
    tenantId: hostTenant.tenant_id,
    locale: pageLocale,
    defaultLocale: result.site.default_locale,
    usedSectionTypes,
    cookies: cookiesFromHeader(request.headers.cookie),
    memberId: member?.id ?? null,
  });

  const requiresMember = result.page.requires_member === true;
  const memberAuthenticated = member !== null;
  // 未登录才锁门；已登录 cookie 会话直接渲染正文。
  const memberGate = requiresMember && !memberAuthenticated;

  sendHtml(
    reply,
    200,
    renderMarketingHtml({
      origin: requestOrigin(request),
      site: result.site,
      page: result.page,
      memberGate,
      accountEntryHtml: accountEntry.html,
      enabledEntitlements,
      contributed,
      isDefaultTenant: hostTenant.tenant_id === DEFAULT_TENANT_ID,
    }),
    {
      // 登录态页头 / 解锁正文因人而异，禁止公共缓存。
      privateCache: memberAuthenticated || requiresMember,
    },
  );
}

export async function marketingSsrRoutes(app: FastifyInstance): Promise<void> {
  app.get("/sitemap.xml", async (request, reply) => {
    await ensureHostTenant(request);
    const hostTenant = request.hostTenantContext;
    if (!hostTenant) {
      return reply.status(404).send("Not Found");
    }
    const entries = await getPublishedSitemapEntries(hostTenant.tenant_id);
    if (!entries) {
      return reply.status(404).send("Not Found");
    }
    const extra = await resolveContributedSitemapEntries(hostTenant.tenant_id);
    const xml = renderSitemapXml(requestOrigin(request), [
      ...entries,
      ...extra,
    ]);
    return reply
      .header("content-type", "application/xml; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(xml);
  });

  app.get("/robots.txt", async (request, reply) => {
    await ensureHostTenant(request);
    if (!request.hostTenantContext) {
      return reply.status(404).send("Not Found");
    }
    return reply
      .header("content-type", "text/plain; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(renderRobotsTxt(requestOrigin(request)));
  });

  /* -------------------------------------------------- 站点默认语言（无前缀） */

  app.get("/", async (request, reply) => {
    await renderPath(request, reply, "/");
  });

  /* ------------------------------------------------------ 其余语言（前缀树） */

  /*
   * 一级参数路由同时承担两件事：`/{locale}` 与 `/{slug}`。
   *
   * 两者在 URL 上是同一个位置，只能靠取值区分——所以 locale 的 slug 必须占住
   * `RESERVED_PAGE_SLUGS`（见 shared/reserved-slugs.ts），否则一个叫 `en` 的顶层页
   * 会把整棵 `/en/*` 遮住。贡献路径（`/docs/*` 等）由 `renderPath` 问 path handler
   * 表；`/sitemap.xml` / `/robots.txt` 由 Fastify 静态路由优先匹配，都不会落到这里。
   */
  app.get("/:first", async (request, reply) => {
    const { first } = request.params as { first: string };
    const locale = resolveLocaleSegment(first);
    if (locale) {
      // `/{locale}` = 该语言的首页
      await renderPath(request, reply, "/", locale);
      return;
    }
    if (isSpaShellPath(`/${first}`)) {
      return reply.callNotFound();
    }
    await renderPath(request, reply, `/${first}`);
  });

  app.get("/:first/:second", async (request, reply) => {
    const { first, second } = request.params as {
      first: string;
      second: string;
    };
    const locale = resolveLocaleSegment(first);
    if (locale) {
      const logical = `/${second}`;
      if (isSpaShellPath(logical)) {
        return reply.callNotFound();
      }
      await renderPath(request, reply, logical, locale);
      return;
    }
    // 非 locale 的两级路径：应用区交回 SPA，其余当租户嵌套页或贡献路径
    const logical = `/${first}/${second}`;
    if (isSpaShellPath(`/${first}`)) {
      return reply.callNotFound();
    }
    await renderPath(request, reply, logical);
  });

  app.get("/:first/:second/:third", async (request, reply) => {
    const { first, second, third } = request.params as {
      first: string;
      second: string;
      third: string;
    };
    const locale = resolveLocaleSegment(first);
    if (locale) {
      const logical = `/${second}/${third}`;
      if (isSpaShellPath(logical)) {
        return reply.callNotFound();
      }
      await renderPath(request, reply, logical, locale);
      return;
    }
    if (isSpaShellPath(`/${first}`)) {
      return reply.callNotFound();
    }
    await renderPath(request, reply, `/${first}/${second}/${third}`);
  });
}
