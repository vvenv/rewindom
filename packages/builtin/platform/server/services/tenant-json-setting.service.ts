
import { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

export async function getTenantJsonSetting<T>(
  tenantId: string,
  key: string,
  normalize: (raw: Partial<T> | null | undefined) => T,
  defaultValue: T,
): Promise<T> {
  try {
    const row = await prisma.tenantSetting.findUnique({
      where: {
        tenant_id_key: { tenant_id: tenantId, key },
      },
    });
    if (row?.value != null) {
      return normalize(row.value as Partial<T>);
    }
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2021"
    ) {
      return normalize(defaultValue);
    }
    throw err;
  }

  return normalize(defaultValue);
}

export async function saveTenantJsonSetting<T>(
  tenantId: string,
  key: string,
  value: T,
  tx?: Prisma.TransactionClient,
): Promise<T> {
  const client = tx ?? prisma;
  const json = value as unknown as Prisma.InputJsonValue;
  await client.tenantSetting.upsert({
    where: {
      tenant_id_key: { tenant_id: tenantId, key },
    },
    create: {
      tenant_id: tenantId,
      key,
      value: json,
      secret: null,
    },
    update: {
      value: json,
    },
  });

  return value;
}
