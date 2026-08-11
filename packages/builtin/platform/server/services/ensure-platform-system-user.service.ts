import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID, PLATFORM_ADMIN_USER_ID  } from "@be-water/shared";

import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";

/** Internal User row backing platform admin background jobs (FK target). */
export const PLATFORM_SYSTEM_USERNAME = "__platform_system__";

/** Exclude synthetic platform system user from user-facing lists. */
export const excludePlatformSystemUserWhere: Pick<Prisma.UserWhereInput, "id"> =
  {
    id: { not: PLATFORM_ADMIN_USER_ID },
  };

export async function ensurePlatformSystemUser(): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: DEFAULT_TENANT_ID },
    select: { id: true },
  });
  if (!tenant) return;

  await prisma.user.upsert({
    where: { id: PLATFORM_ADMIN_USER_ID },
    create: {
      id: PLATFORM_ADMIN_USER_ID,
      tenant_id: DEFAULT_TENANT_ID,
      username: PLATFORM_SYSTEM_USERNAME,
      password: "!",
      is_system_admin: true,
      enabled: false,
    },
    update: {},
  });
}
