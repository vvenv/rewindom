import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from "@rewindom/shared";

const DEFAULT_TENANT_NAME = "Rewindom";

export async function ensureDefaultTenant(): Promise<void> {
  await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    create: {
      id: DEFAULT_TENANT_ID,
      slug: DEFAULT_TENANT_SLUG,
      name: DEFAULT_TENANT_NAME,
      status: "active",
      plan: "free",
    },
    update: {
      slug: DEFAULT_TENANT_SLUG,
      name: DEFAULT_TENANT_NAME,
      status: "active",
    },
  });
}
