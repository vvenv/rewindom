import { getServerTenantCatalog } from "@be-water/server-kernel/runtime/tenant-catalog.js";
import { findCatalogFeature, type TenantFeatureKey } from "@be-water/shared";

import { isTenantFeatureEnabled } from "../services/tenant-feature.service.js";

import type { FastifyReply, FastifyRequest } from "fastify";

export function createTenantFeaturePreHandler(key: TenantFeatureKey) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const tenantId = request.tenantContext!.tenant_id;
    const enabled = await isTenantFeatureEnabled(tenantId, key);
    if (enabled) {
      return;
    }

    const catalog = getServerTenantCatalog();
    const feature = findCatalogFeature(catalog, key);
    const label = feature?.label ?? key;
    return reply.code(403).send({
      error: `${label}功能未启用，请联系平台管理员`,
      code: "FEATURE_DISABLED",
    });
  };
}
