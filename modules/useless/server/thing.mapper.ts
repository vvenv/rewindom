import { prisma } from "@rewindom/module-sdk/server";

import { isThingKind, type Thing, type ThingListItem } from "../shared/index.js";

/** 从 prisma 实例推导记录类型——外部模块拿不到生成的 Prisma client 类型。 */
type ThingRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.thing.findFirst>>
>;

/** 库里是自由文本列，读出来收敛到联合类型；认不出的一律当 text。 */
function toKind(value: string): Thing["kind"] {
  return isThingKind(value) ? value : "text";
}

/** 存的是 UTC 零点，对外一律是 `YYYY-MM-DD`——别把时区泄进 API。 */
function toDateKey(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function toThingListItem(record: ThingRecord): ThingListItem {
  return {
    id: record.id,
    kind: toKind(record.kind),
    title: record.title,
    text: record.text,
    published_on: toDateKey(record.published_on),
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
    kind: toKind(record.kind),
    title: record.title,
    text: record.text,
    html: record.html,
    published_on: toDateKey(record.published_on),
    enabled: record.enabled,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
