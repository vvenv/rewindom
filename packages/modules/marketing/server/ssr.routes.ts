import {
  resolveHostTenant,
  resolveRequestHostname,
} from "@be-water/server-kernel/lib/host-tenant.js";

import {
  getPublishedPublicPage,
  getPublishedPublicSite,
} from "./site.service.js";
import {
  renderMarketingHtml,
  renderRobotsTxt,
  renderSitemapXml,
  renderUnavailableHtml,
} from "./ssr-render.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const SPA_PREFIXES = [
  "app",
  "login",
  "register",
  "platform",
  "billing",
  "settings",
  "notes",
  "todos",
  "users",
  "roles",
  "audit",
  "notifications",
  "api",
  "assets",
  "health",
] as const;

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

  const result = await getPublishedPublicPage(hostTenant.tenant_id, path);
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

  sendHtml(
    reply,
    200,
    renderMarketingHtml({
      origin: requestOrigin(request),
      site: result.site,
      page: result.page,
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
    const site = await getPublishedPublicSite(hostTenant.tenant_id);
    if (!site) {
      return reply.status(404).send("Not Found");
    }
    const xml = renderSitemapXml(
      requestOrigin(request),
      site.pages.map((p) => ({ path: p.path })),
    );
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

  app.get("/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (SPA_PREFIXES.includes(slug as (typeof SPA_PREFIXES)[number])) {
      return reply.callNotFound();
    }
    await renderPath(request, reply, `/${slug}`);
  });
}
