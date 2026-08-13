import { getServerTenantCatalog } from "@rewindom/server-kernel/runtime/tenant-catalog.js";

import { isTenantModuleEnabled } from "../services/tenant-module.service.js";

import type { FastifyReply, FastifyRequest } from "fastify";

export function createTenantModulePreHandler(moduleId: string) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const catalog = getServerTenantCatalog();
    const definition = catalog.modules.find(
      (module) => module.module_id === moduleId,
    );
    if (!definition) {
      return;
    }

    const tenantId = request.tenantContext!.tenant_id;
    const enabled = await isTenantModuleEnabled(tenantId, moduleId);
    if (enabled) {
      return;
    }

    return reply.code(403).send({
      error: `${definition.label}模块未启用，请联系平台管理员`,
      code: "MODULE_DISABLED",
    });
  };
}
