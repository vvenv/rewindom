
import { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";

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

  if (tenantId === DEFAULT_TENANT_ID) {
    try {
      const legacy = await prisma.appSetting.findUnique({ where: { key } });
      if (legacy?.value != null) {
        return normalize(legacy.value as Partial<T>);
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

  if (tenantId === DEFAULT_TENANT_ID) {
    await client.appSetting.deleteMany({ where: { key } });
  }

  return value;
}
