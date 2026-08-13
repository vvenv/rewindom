import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

const TENANT_MODULES_KEY = "tenant_modules";

export async function isShopEnabled(tenantId: string): Promise<boolean> {
  const row = await prisma.tenantSetting.findUnique({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: TENANT_MODULES_KEY },
    },
    select: { value: true },
  });
  const value = row?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const flag = (value as Record<string, unknown>).shop;
  return flag === true;
}
