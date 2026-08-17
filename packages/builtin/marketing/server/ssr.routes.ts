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

import { builtinNotFoundPage } from "../shared/page-missing.js";
import {
  NOT_FOUND_PAGE_KIND,
  NOT_FOUND_PATH,
} from "../shared/page-templates.js";
import { collectSectionTypes } from "../shared/sections/collect-types.js";
import { isSpaShellPath, parseMarketingSsrPath } from "../shared/site-locale.js";
import { matchSitePathHandler } from "../shared/site-path-handlers.js";
import { localizeRedirectLocation } from "../shared/site-redirect.js";

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
  getSiteChromeOrFallback,
  resolveVisitorHomePath,
} from "./site.service.js";
import { resolveContributedSitemapEntries } from "./sitemap-providers.js";
import {
  renderMarketingHtml,
  renderRobotsTxt,
  renderSitemapXml,
  renderUnavailableHtml,
} from "./ssr-render.js";
import { createStarterTranslator } from "./starter-i18n.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

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

async function sendSiteRedirect(
  reply: FastifyReply,
  tenantId: string,
  path: string,
  locale: AppLocale | null,
): Promise<boolean> {
  const redirect = await findSiteRedirect(tenantId, path);
  if (!redirect) return false;
  const location = localizeRedirectLocation(redirect.to_path, locale);
  void reply
    // 301 会被浏览器长期缓存，别再让中间层多缓存一层：改规则时要能立刻生效
    .header("cache-control", "no-store")
    .redirect(location, redirect.status_code);
  return true;
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
 * 自定义 404：`not_found` 模板页（中台常驻，和首页同一套编辑器）。没有已发布的
 * 那张页就用内置兜底——仍套站点 chrome，正文是居中 404 + 回首页。
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
    NOT_FOUND_PATH,
    hostTenant.tenant_slug,
    locale,
  );
  if (!custom) {
    const site = await getSiteChromeOrFallback(
      hostTenant.tenant_id,
      hostTenant.tenant_slug,
      hostTenant.name,
      locale,
    );
    const pageLocale = normalizeLocale(locale, site.default_locale);
    const page = builtinNotFoundPage({
      locale: pageLocale,
      defaultLocale: site.default_locale,
      t: createStarterTranslator(pageLocale),
    });
    const usedSectionTypes = collectSectionTypes(site.header);
    collectSectionTypes(site.footer, usedSectionTypes);
    collectSectionTypes(page.sections, usedSectionTypes);

    const [accountEntry, enabledEntitlements, contributed] = await Promise.all([
      resolveSiteAccountEntry({
        tenantId: hostTenant.tenant_id,
        locale: pageLocale,
      }),
      resolveSectionEntitlements(hostTenant.tenant_id),
      resolveSectionContexts({
        tenantId: hostTenant.tenant_id,
        locale: pageLocale,
        defaultLocale: site.default_locale,
        usedSectionTypes,
        cookies: cookiesFromHeader(request.headers.cookie),
      }),
    ]);

    sendHtml(
      reply,
      404,
      renderMarketingHtml({
        origin: requestOrigin(request),
        site,
        contributed,
        page,
        accountEntryHtml: accountEntry.html,
        enabledEntitlements,
        isDefaultTenant: hostTenant.tenant_id === DEFAULT_TENANT_ID,
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
      isDefaultTenant: hostTenant.tenant_id === DEFAULT_TENANT_ID,
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

  const enabledEntitlements = await resolveSectionEntitlements(
    hostTenant.tenant_id,
  );
  const { logicalPath, servedPath } = await resolveVisitorHomePath({
    tenantId: hostTenant.tenant_id,
    path,
    entitlements: enabledEntitlements,
  });
  const rendered = await renderLogicalPath(
    request,
    reply,
    hostTenant,
    logicalPath,
    locale,
    enabledEntitlements,
    servedPath,
  );
  if (rendered) return;
  /*
   * 首页改写成 `/events` 之类之后目标打不开（开关关了、页删了）：站点根不能 404，
   * 回落默认 home 模板。
   */
  await renderLogicalPath(
    request,
    reply,
    hostTenant,
    "/",
    locale,
    enabledEntitlements,
    "/",
  );
}

/**
 * 渲染一条已经定好的逻辑路径。找不到时：首页改写返回 false 让调用方回落；
 * 其它地址走 404 / 重定向。
 */
async function renderLogicalPath(
  request: FastifyRequest,
  reply: FastifyReply,
  hostTenant: NonNullable<FastifyRequest["hostTenantContext"]>,
  path: string,
  locale: AppLocale | null,
  enabledEntitlements: ReadonlySet<string>,
  servedPath: string,
): Promise<boolean> {
  const homeRewrite = servedPath === "/" && path !== "/";

  /*
   * 贡献路径（文档库 `/docs` 等）在查 MarketingPage 之前问注册表。
   * 匹配的是去掉 locale 前缀后的逻辑路径，所以 `/en/docs` 与 `/docs` 同一条。
   */
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
      servedPath,
      locale,
      enabledEntitlements,
      accountEntryHtml: accountEntry.html,
      cookies: cookiesFromHeader(request.headers.cookie),
      query: flattenQuery(request.query),
    });
    if (html === null) {
      if (homeRewrite) return false;
      if (await sendSiteRedirect(reply, hostTenant.tenant_id, path, locale)) {
        return true;
      }
      await renderNotFound(request, reply, hostTenant, locale);
      return true;
    }
    sendHtml(reply, 200, html);
    return true;
  }

  const result = await getPublishedPublicPage(
    hostTenant.tenant_id,
    path,
    hostTenant.tenant_slug,
    locale,
  );
  if (!result) {
    if (homeRewrite) return false;
    /*
     * 顺序是刻意的：**先查真实页面，找不到才查重定向**。
     *
     * 反过来（重定向优先）的话，租户后来又建了一个同名页就永远打不开——而那种错很难
     * 联想到是几个月前加的一条重定向造成的。重定向本来就是给「曾经存在的路径」用的。
     */
    if (await sendSiteRedirect(reply, hostTenant.tenant_id, path, locale)) {
      return true;
    }

    await renderNotFound(request, reply, hostTenant, locale);
    return true;
  }

  /*
   * 预览地址 `/404` 命中的就是这张模板页。它不是一篇真实内容，状态码仍须是 404，
   * 否则搜索引擎会把 `/404` 本身收成一张软 404。
   */
  if (result.page.kind === NOT_FOUND_PAGE_KIND) {
    await renderNotFound(request, reply, hostTenant, locale);
    return true;
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
      servedPath,
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
  return true;
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

  /*
   * 一条 catch-all 接所有其余公开地址。以前按段数挂 `/:first` / `/:first/:second` /
   * `/:first/:second/:third`：超过三段（`/en/docs/guide/intro`）和末尾斜杠
   * （`/old/`）都进不了渲染，重定向也没机会跑，直接掉到 JSON 404。
   *
   * `/*` 在 find-my-way 里优先级最低，静态路径（`/member/login`、`/sitemap.xml`）
   * 和参数路径（`/shop/:slug`）仍然先命中。locale 的 slug 必须占住
   * `RESERVED_PAGE_SLUGS`，否则一个叫 `en` 的顶层页会把整棵 `/en/*` 遮住。
   */
  app.get("/*", async (request, reply) => {
    const { logicalPath, locale } = parseMarketingSsrPath(request.url);
    if (isSpaShellPath(logicalPath)) {
      return reply.callNotFound();
    }
    await renderPath(request, reply, logicalPath, locale);
  });
}
