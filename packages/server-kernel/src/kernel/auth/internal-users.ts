import { PLATFORM_ADMIN_USER_ID, TENANT_IMPERSONATION_USERNAME  } from "@rewindom/shared";

import type { Prisma } from "../../generated/prisma/client/client.js";

/** Exclude platform system user and per-tenant impersonation shadow users from user-facing lists. */
export const excludeInternalUsersWhere: Pick<
  Prisma.UserWhereInput,
  "id" | "username"
> = {
  id: { not: PLATFORM_ADMIN_USER_ID },
  username: { not: TENANT_IMPERSONATION_USERNAME },
};
