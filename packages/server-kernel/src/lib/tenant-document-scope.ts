import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";

export function buildTenantDocumentCountWhere(
  tenantId: string,
): Prisma.DocumentWhereInput {
  return {
    scope: "TENANT",
    tenant_id: tenantId,
  };
}
