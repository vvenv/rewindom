import { prisma } from "@rewindom/module-sdk/server";

import type { Thing, ThingListItem } from "../shared/index.js";

/** 从 prisma 实例推导记录类型——外部模块拿不到生成的 Prisma client 类型。 */
type ThingRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.thing.findFirst>>
>;

export function toThingListItem(record: ThingRecord): ThingListItem {
  return {
    id: record.id,
    text: record.text,
    enabled: record.enabled,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toThing(record: ThingRecord): Thing {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    text: record.text,
    enabled: record.enabled,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
