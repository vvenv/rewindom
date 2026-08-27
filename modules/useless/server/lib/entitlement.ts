import { prisma } from "@rewindom/module-sdk/server";

const TENANT_MODULES_KEY = "tenant_modules";

/** 站点是否开通了无用模块。未开通时段不渲染，与「添加区块」里不出现同一条闸门。 */
export async function isUselessEnabled(tenantId: string): Promise<boolean> {
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
  return (value as Record<string, unknown>).useless === true;
}
