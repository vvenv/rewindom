import {
  resolveHostTenant,
  resolveRequestHostname,
} from "@be-water/server-kernel/lib/host-tenant.js";

import {
  resolveLocaleSegment,
  SITE_APP_PREFIXES,
} from "../shared/site-locale.js";

import {
  getPublishedPublicPage,
  getPublishedSitemapEntries,
} from "./site.service.js";
import { resolveSpaEntrySrc } from "./spa-entry.js";
import {
  renderMarketingHtml,
  renderRobotsTxt,
  renderSitemapXml,
  renderUnavailableHtml,
} from "./ssr-render.js";

import type { AppLocale } from "@be-water/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const SPA_PREFIX_SET = new Set<string>(SITE_APP_PREFIXES);

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

function sendHtml(reply: FastifyReply, status: number, html: string): void {
  void reply
    .status(status)
    .header("content-type", "text/html; charset=utf-8")
    .header("cache-control", "public, max-age=60")
    .send(html);
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

  const result = await getPublishedPublicPage(
    hostTenant.tenant_id,
    path,
    hostTenant.tenant_slug,
    locale,
  );
  if (!result) {
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

  // localStorage 会员 token 不随 HTML 请求发送：SSR 只能输出「需登录」占位 + noindex，
  // 正文由 SPA 接管后带 token 拉取（见 TenantSitePageGate）——所以这里必须把 SPA
  // 入口带上，否则会员页会永远停在占位上。
  sendHtml(
    reply,
    200,
    renderMarketingHtml({
      origin: requestOrigin(request),
      site: result.site,
      page: result.page,
      spaEntrySrc: resolveSpaEntrySrc() ?? undefined,
      memberGate: result.page.requires_member === true,
    }),
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
    const xml = renderSitemapXml(requestOrigin(request), entries);
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

  app.get("/docs", async (request, reply) => {
    await renderPath(request, reply, "/docs");
  });

  app.get("/docs/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    await renderPath(request, reply, `/docs/${slug}`);
  });

  /* ------------------------------------------------------ 其余语言（前缀树） */

  /*
   * 一级参数路由同时承担两件事：`/{locale}` 与 `/{slug}`。
   *
   * 两者在 URL 上是同一个位置，只能靠取值区分——所以 locale 的 slug 必须占住
   * `RESERVED_PAGE_SLUGS`（见 shared/site-cms.ts），否则一个叫 `en` 的顶层页
   * 会把整棵 `/en/*` 遮住。静态段（`/docs`、`/sitemap.xml`）由 Fastify 优先匹配，
   * 不会落到这里。
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
