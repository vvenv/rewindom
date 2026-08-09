import {
  resolveHostTenant,
  resolveRequestHostname,
} from "@be-water/server-kernel/lib/host-tenant.js";
import { normalizeLocale, type AppLocale } from "@be-water/shared";

import { DOCS_INDEX_PATH, docPath } from "../shared/marketing-doc.js";
import { collectSectionTypes } from "../shared/sections/collect-types.js";
import {
  resolveLocaleSegment,
  SITE_APP_PREFIXES,
} from "../shared/site-locale.js";

import { listPublishedDocs } from "./marketing-doc.service.js";
import { renderDocLibrary } from "./marketing-doc.ssr.js";
import { resolveSiteAccountEntry } from "./site-account-entry.js";
import { resolveSectionEntitlements } from "./site-entitlements.js";
import { resolveSiteMemberSsrSession } from "./site-member-ssr-session.js";
import { findSiteRedirect } from "./site-redirect.service.js";
import {
  getPublishedPublicPage,
  getPublishedPublicSite,
  getPublishedSitemapEntries,
} from "./site.service.js";
import {
  renderMarketingHtml,
  renderRobotsTxt,
  renderSitemapXml,
  renderUnavailableHtml,
} from "./ssr-render.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const SPA_PREFIX_SET = new Set<string>(SITE_APP_PREFIXES);

/** 自定义 404 页的约定 slug。 */
const NOT_FOUND_SLUG_PATH = "/404";

function requestOrigin(request: FastifyRequest): string {
  const proto =
    (request.headers["x-forwarded-proto"] as string | undefined)
      ?.split(",")[0]
      ?.trim() || "https";
  const host =
    resolveRequestHostname(request.headers) || request.hostname || "localhost";
  return `${proto}://${host}`;
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

  const [accountEntry, enabledEntitlements] = await Promise.all([
    resolveSiteAccountEntry({
      tenantId: hostTenant.tenant_id,
      locale: normalizeLocale(custom.page.locale, custom.site.default_locale),
    }),
    resolveSectionEntitlements(hostTenant.tenant_id),
  ]);

  sendHtml(
    reply,
    404,
    renderMarketingHtml({
      origin: requestOrigin(request),
      site: custom.site,
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
   * 租户文档库：`/docs`（索引）与 `/docs/:slug`（详情）。数据来自 `MarketingDoc` 表，
   * 版式来自两张文档模板页（见 `marketing-doc.ssr.ts`）。
   * 拦截在 `renderPath` 里，所以 `/docs`、`/{locale}/docs` 都走这一条。
   */
  if (path === DOCS_INDEX_PATH || path.startsWith(`${DOCS_INDEX_PATH}/`)) {
    const site = await getPublishedPublicSite(
      hostTenant.tenant_id,
      hostTenant.tenant_slug,
      locale,
    );
    if (site) {
      const [accountEntry, enabledEntitlements] = await Promise.all([
        resolveSiteAccountEntry({
          tenantId: hostTenant.tenant_id,
          locale: normalizeLocale(site.default_locale),
        }),
        resolveSectionEntitlements(hostTenant.tenant_id),
      ]);
      const html = await renderDocLibrary({
        tenantId: hostTenant.tenant_id,
        origin: requestOrigin(request),
        site,
        accountEntryHtml: accountEntry.html,
        enabledEntitlements,
        path,
        locale,
      });
      if (html) {
        sendHtml(reply, 200, html);
        return;
      }
    }
    await renderNotFound(request, reply, hostTenant, locale);
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

  const [accountEntry, enabledEntitlements] = await Promise.all([
    resolveSiteAccountEntry({
      tenantId: hostTenant.tenant_id,
      locale: normalizeLocale(result.page.locale, result.site.default_locale),
      member,
    }),
    // 贡献段按租户开通与否决定渲不渲染，见 site-entitlements.ts
    resolveSectionEntitlements(hostTenant.tenant_id),
  ]);

  /*
   * 普通页面上的 `doc-*` 段（首页的「最新文档」、页脚的文档目录……）也要有数据。
   *
   * 先看这一页（连同页头页脚）到底有没有摆过这类段——**有才查库**。文档目录与页面
   * 渲染没有必然关系，为每一次页面请求多打一条 SQL 只为了几乎总是没人用的可能性，
   * 是纯粹的浪费。
   */
  const usesDocSections = [
    ...collectSectionTypes(result.site.header),
    ...collectSectionTypes(result.site.footer),
    ...collectSectionTypes(result.page.sections),
  ].some((type) => type.startsWith("doc-"));
  const docContext = usesDocSections
    ? {
        docs: (
          await listPublishedDocs(hostTenant.tenant_id, result.page.locale)
        ).docs,
        docsIndexPath: DOCS_INDEX_PATH,
      }
    : undefined;

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
      docContext,
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
    /*
     * 文档不是页面，所以 `getPublishedSitemapEntries`（走 MarketingPage）看不见它们
     * ——在这里补。索引页恒列；单篇按已发布的实际地址列，`lastmod` 用各自的更新时间。
     */
    // 只列站点主语言那一份：主语言 URL 不带前缀，非主语言的文档目前整库回落到它
    const { docs } = await listPublishedDocs(hostTenant.tenant_id, null);
    const docEntries = docs.length
      ? [
          { path: DOCS_INDEX_PATH, updated_at: docs[0]!.updated_at },
          ...docs.map((doc) => ({
            path: docPath(doc.slug),
            updated_at: doc.updated_at,
          })),
        ]
      : [];
    const xml = renderSitemapXml(requestOrigin(request), [
      ...entries,
      ...docEntries,
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
   * `RESERVED_PAGE_SLUGS`（见 shared/site-cms.ts），否则一个叫 `en` 的顶层页
   * 会把整棵 `/en/*` 遮住。`/docs/*` 由 `renderPath` 内部拦截走文档库，
   * `/sitemap.xml` / `/robots.txt` 由 Fastify 静态路由优先匹配，都不会落到这里。
   */
  app.get("/:first", async (request, reply) => {
    const { first } = request.params as { first: string };
    const locale = resolveLocaleSegment(first);
    if (locale) {
      // `/{locale}` = 该语言的首页
      await renderPath(request, reply, "/", locale);
      return;
    }
    if (SPA_PREFIX_SET.has(first)) {
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
      await renderPath(request, reply, `/${second}`, locale);
      return;
    }
    // 非 locale 的两级路径：应用区交回 SPA，其余当租户嵌套页（`/docs/x`）
    if (SPA_PREFIX_SET.has(first)) {
      return reply.callNotFound();
    }
    await renderPath(request, reply, `/${first}/${second}`);
  });

  app.get("/:first/:second/:third", async (request, reply) => {
    const { first, second, third } = request.params as {
      first: string;
      second: string;
      third: string;
    };
    const locale = resolveLocaleSegment(first);
    if (locale) {
      if (SPA_PREFIX_SET.has(second)) {
        return reply.callNotFound();
      }
      await renderPath(request, reply, `/${second}/${third}`, locale);
      return;
    }
    if (SPA_PREFIX_SET.has(first)) {
      return reply.callNotFound();
    }
    await renderPath(request, reply, `/${first}/${second}/${third}`);
  });
}
