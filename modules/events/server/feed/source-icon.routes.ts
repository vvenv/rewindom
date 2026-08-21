/**
 * 工作台 `<img>` 走 `/api`：不带 JWT、Vite 始终代理。
 * 租户写在路径里，SSRF 仍只抓该站 EventFeed 推出来的 host。
 */

import { prisma } from "@rewindom/module-sdk/server";

import { isIconHost } from "../../shared/source-icon.js";
import { renderSourceIcon } from "../ssr/source-icon.js";

import type { FastifyInstance } from "fastify";

export async function sourceIconRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/public/tenants/:slug/events/icons/:host",
    async (request, reply) => {
      const { slug, host } = request.params as { slug: string; host: string };
      const decoded = decodeHost(host);
      if (!decoded || !isIconHost(decoded)) {
        return reply.status(404).send();
      }
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!tenant) {
        return reply.status(404).send();
      }
      const result = await renderSourceIcon({
        tenantId: tenant.id,
        host: decoded,
      });
      if (!result) {
        return reply.status(404).send();
      }
      return reply
        .header("content-type", result.content_type)
        .header("cache-control", result.cache_control ?? "public, max-age=86400")
        .send(result.body);
    },
  );
}

function decodeHost(value: string): string | null {
  try {
    return decodeURIComponent(value).toLowerCase();
  } catch {
    return null;
  }
}
