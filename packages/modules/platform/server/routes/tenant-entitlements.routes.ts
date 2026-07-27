import { success } from "@be-water/shared";

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
}
