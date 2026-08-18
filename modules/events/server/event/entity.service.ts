/**
 * 实体的落库与关联。
 *
 * 与 `refreshEvents` 同一条口径：**幂等**。同样的信号集合重跑得到同样的关联，
 * 出问题可以放心重跑。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { normalizeEntityName, type ExtractedEntity } from "./entity-extractor.js";

/** 一个事件最多关联多少实体——详情页展示得下，也避免长标题炸出一串。 */
const MAX_LINKS_PER_EVENT = 12;

/**
 * 把抽出来的实体同步到事件上。
 *
 * 整体替换而不是增量追加：实体是**当前信号集合**的函数，信号变了就该重算。
 * 与时间线同理——不在本轮结果里的关联要撤掉，否则事件会永远背着早期措辞里的误抽。
 */
export async function syncEventEntities(params: {
  tenant_id: string;
  event_id: string;
  entities: readonly ExtractedEntity[];
}): Promise<void> {
  const wanted = dedupe(params.entities).slice(0, MAX_LINKS_PER_EVENT);

  const entityIds = new Map<string, string>();
  for (const entity of wanted) {
    entityIds.set(keyOf(entity), await upsertEntity(params.tenant_id, entity));
  }

  await prisma.$transaction([
    // 本轮没抽到的关联要撤掉
    prisma.eventEntityLink.deleteMany({
      where: withTenantScope(params.tenant_id, {
        event_id: params.event_id,
        entity_id: { notIn: [...entityIds.values()] },
      }),
    }),
    ...wanted.map((entity) => {
      const entityId = entityIds.get(keyOf(entity)) as string;
      return prisma.eventEntityLink.upsert({
        where: {
          event_id_entity_id: {
            event_id: params.event_id,
            entity_id: entityId,
          },
        },
        create: {
          tenant_id: params.tenant_id,
          event_id: params.event_id,
          entity_id: entityId,
          mention_count: entity.mention_count,
        },
        update: { mention_count: entity.mention_count },
      });
    }),
  ]);
}

/**
 * 取（或建）实体。
 *
 * 并发采集下两个 worker 可能同时插同一个实体；唯一键
 * `(tenant_id, kind, normalized)` 赢的那个就是答案——与 `createEvent` 同一套写法。
 */
async function upsertEntity(
  tenantId: string,
  entity: ExtractedEntity,
): Promise<string> {
  const normalized = normalizeEntityName(entity.name);
  const where = {
    tenant_id_kind_normalized: {
      tenant_id: tenantId,
      kind: entity.kind,
      normalized,
    },
  };

  const existing = await prisma.eventEntity.findUnique({
    where,
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  try {
    const created = await prisma.eventEntity.create({
      data: {
        tenant_id: tenantId,
        name: entity.name.trim(),
        kind: entity.kind,
        normalized,
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    const conflicted = await prisma.eventEntity.findUnique({
      where,
      select: { id: true },
    });
    if (conflicted) {
      return conflicted.id;
    }
    throw new Error(`实体落库失败：${entity.name}`);
  }
}

/** 同名同类只留一条，提及次数相加。 */
function dedupe(entities: readonly ExtractedEntity[]): ExtractedEntity[] {
  const byKey = new Map<string, ExtractedEntity>();
  for (const entity of entities) {
    const key = keyOf(entity);
    const seen = byKey.get(key);
    if (seen) {
      seen.mention_count += entity.mention_count;
    } else {
      byKey.set(key, { ...entity });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.mention_count - a.mention_count || a.name.localeCompare(b.name),
  );
}

function keyOf(entity: ExtractedEntity): string {
  return `${entity.kind} ${normalizeEntityName(entity.name)}`;
}

/** 事件的实体，按提及次数降序。展示用，两条读路径共用。 */
export async function listEventEntities(params: {
  tenant_id: string;
  event_id: string;
}) {
  return prisma.eventEntityLink.findMany({
    where: withTenantScope(params.tenant_id, { event_id: params.event_id }),
    orderBy: { mention_count: "desc" },
    take: 12,
    select: {
      mention_count: true,
      entity: { select: { id: true, name: true, kind: true } },
    },
  });
}
