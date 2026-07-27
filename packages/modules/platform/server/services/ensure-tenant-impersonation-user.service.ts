
import {
  type Prisma,
  type User,
} from "@be-water/server-kernel/generated/prisma/client/client.js";
import { excludeInternalUsersWhere } from "@be-water/server-kernel/kernel/auth/internal-users.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { TENANT_IMPERSONATION_USERNAME } from "@be-water/shared";

export { excludeInternalUsersWhere };

export function buildTenantImpersonationUserCreateData(
  tenantId: string,
): Prisma.UserUncheckedCreateInput {
  return {
    tenant_id: tenantId,
    username: TENANT_IMPERSONATION_USERNAME,
    password: "!",
    is_system_admin: true,
    enabled: false,
  };
}

export async function ensureTenantImpersonationUser(
  tenantId: string,
  tx?: Prisma.TransactionClient,
): Promise<User> {
  const client = tx ?? prisma;
  return client.user.upsert({
    where: {
      tenant_id_username: {
        tenant_id: tenantId,
        username: TENANT_IMPERSONATION_USERNAME,
      },
    },
    create: buildTenantImpersonationUserCreateData(tenantId),
    update: {
      is_system_admin: true,
      enabled: false,
    },
  });
}
