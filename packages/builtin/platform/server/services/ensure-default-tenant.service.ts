import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from "@rewindom/shared";


export async function ensureDefaultTenant(): Promise<void> {
  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    create: {
      id: DEFAULT_TENANT_ID,
      slug: DEFAULT_TENANT_SLUG,
      name: "默认租户",
      status: "active",
      plan: "free",
    },
    update: {
      slug: DEFAULT_TENANT_SLUG,
      status: "active",
    },
  });
}
