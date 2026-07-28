import { success } from "@be-water/shared";

import { resolveTenantAppearance } from "../services/tenant-appearance.service.js";
import { getTenantEntitlements } from "../services/tenant-entitlement.service.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/**
 * 租户 entitlement 查询端点。
 *
 * 路径保持 `/api/settings/tenant-features` —— `@be-water/client-kit` 的
 * `useTenantEntitlements` 硬编码调用它，而 client-kit 是模板设施，必须在
 * 不启用任何业务模块时也能工作。此前该路由住在 be-water 的 settings 子域，
 * 导致上游缺了它就 404（`ProtectedRoute` / `Sidebar` 都依赖）。
 * service 本就在本模块，路由归位于此。
 */
export async function tenantEntitlementsRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.get(
    "/tenant-features",
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantContext!.tenant_id;
      const entitlements = await getTenantEntitlements(tenantId);
      return reply.send(success(entitlements));
    },
  );

  /**
   * 租户侧生效的外观默认值：主题与布局，各自「租户配置 > 平台默认」。
   * 与 tenant-features 同理住在 `/api/settings`：client-kit 的外观 Provider
   * 硬编码调用它，必须在只装 platform 模块时也能工作。
   * 用户在浏览器里的个人选择不落库，只覆盖前端 localStorage。
   */
  app.get(
    "/appearance",
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantContext!.tenant_id;
      return reply.send(success(await resolveTenantAppearance(tenantId)));
    },
  );
}
