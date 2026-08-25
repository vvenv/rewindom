/**
 * 实体的落库与关联。
 *
 * 与 `refreshEvents` 同一条口径：**幂等**。同样的信号集合重跑得到同样的关联，
 * 出问题可以放心重跑。
 */
import { randomUUID } from "node:crypto";

import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import {
  isChangelogNoiseName,
  normalizeEntityName,
  type ExtractedEntity,
} from "./entity-extractor.js";
import { slugifyTitle } from "./slug.js";

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
  /**
   * 出版方实体（采集源标注的，不是从文本里抽的）。
   *
   * **必须一起传进来**：这个函数是整体替换，不在 wanted 集合里的关联会被删掉。
   * 只把它们交给下面的 `ensurePublisherEntityLinks` 补，会变成「这一轮加、
   * 下一轮删」的抖动。
   */
  publishers?: readonly ExtractedEntity[];
}): Promise<void> {
  const publisherKeys = new Set(
    (params.publishers ?? []).map((entity) => keyOf(entity)),
  );
  const wanted = dedupe(
    [...(params.publishers ?? []), ...params.entities].filter(
      (entity) => !isChangelogNoiseName(entity.name),
    ),
  ).slice(0, MAX_LINKS_PER_EVENT);

  const entityIds = new Map<string, string>();
  for (const entity of wanted) {
    entityIds.set(
      keyOf(entity),
      await upsertEntity(params.tenant_id, entity, {
        adopt_org_placeholder: publisherKeys.has(keyOf(entity)),
      }),
    );
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
          is_publisher: publisherKeys.has(keyOf(entity)),
        },
        update: {
          mention_count: entity.mention_count,
          is_publisher: publisherKeys.has(keyOf(entity)),
        },
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
  options: { adopt_org_placeholder?: boolean } = {},
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

  /*
   * 出版方实体是**人工标注**的，比规则抽取的猜测更可信，所以它可以接管
   * 同名的 `org` 占位——规则实现分不出类型时一律记 `org`（见 entity-extractor
   * 的第 3 道闸），而 kind 是身份键的一部分：不接管的话，同一个 Cloudflare
   * 会长出 `/entities/cloudflare`（org，抽取来的）与另一个 slug（company，
   * 出版方标注的）两张页，读者看到两份割裂的档案。
   *
   * **只接管 `org` 这一格**。已经有明确类型的（LLM 判过 person / place…）
   * 不动——那不再是占位，覆盖它就成了别名合并，而别名合并要人来定。
   */
  if (options.adopt_org_placeholder && entity.kind !== "org") {
    const placeholder = await prisma.eventEntity.findUnique({
      where: {
        tenant_id_kind_normalized: {
          tenant_id: tenantId,
          kind: "org",
          normalized,
        },
      },
      select: { id: true },
    });
    if (placeholder) {
      // slug 不动：它已经被收录、被分享过，改 slug 等于作废累计的实体页权重
      await prisma.eventEntity.update({
        where: { id: placeholder.id },
        data: { kind: entity.kind, name: entity.name.trim() },
      });
      return placeholder.id;
    }
  }

  // slug 的后缀取自 id 而不是随机数——重跑同一条数据得到同样的 slug，
  // 与 buildEventSlug 同一套做法
  const id = randomUUID();
  try {
    const created = await prisma.eventEntity.create({
      data: {
        id,
        tenant_id: tenantId,
        name: entity.name.trim(),
        kind: entity.kind,
        normalized,
        slug: buildEntitySlug(entity.name, id),
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

/**
 * 事件的实体，按提及次数降序。展示用，两条读路径共用。
 *
 * `user_id` 只有工作台/会员面有——公开面没有 viewer，关注态恒为 false。
 */
export async function listEventEntities(params: {
  tenant_id: string;
  event_id: string;
  user_id?: string;
}) {
  const links = await prisma.eventEntityLink.findMany({
    where: withTenantScope(params.tenant_id, { event_id: params.event_id }),
    /*
     * 出版方优先。归位取的是「主实体」（这条材料在谁的记录里排第几），
     * 而一手来源的事件里出版方就是它在讲谁——单信号事件上它的
     * `mention_count` 恒为 1，与抽取出来的实体打平，只按次数排是随机的。
     */
    orderBy: [{ is_publisher: "desc" }, { mention_count: "desc" }],
    take: 12,
    select: {
      mention_count: true,
      // 内容价值谓词要能区分「抽出来的」与「源标注的」，见 hasReaderValue
      is_publisher: true,
      entity: { select: { id: true, name: true, kind: true, slug: true } },
    },
  });

  if (!params.user_id || links.length === 0) {
    return links;
  }

  // 一次取回本页所有实体的关注态，不给每个实体各查一次
  const followed = await prisma.eventEntityFollow.findMany({
    where: withTenantScope(params.tenant_id, {
      user_id: params.user_id,
      entity_id: { in: links.map((link) => link.entity.id) },
    }),
    select: { entity_id: true },
  });
  const followedIds = new Set(followed.map((row) => row.entity_id));

  return links.map((link) => ({
    ...link,
    is_following: followedIds.has(link.entity.id),
  }));
}

/** 实体页 URL 用的可读标识。与 `buildEventSlug` 同一套：可读部分 + id 短后缀。 */
export function buildEntitySlug(name: string, id: string): string {
  return `${slugifyTitle(name)}-${id.replace(/-/gu, "").slice(0, 6)}`;
}

/**
 * 只补出版方关联，**不删任何东西**。
 *
 * `refreshEvent` 只在真的重跑过分析时才整体替换实体（LLM 有 30 分钟冷却，
 * 冷却期内回落到规则抽取会让类型从 `company` 掉回 `org`，而类型是身份键的
 * 一部分——见那里的注释）。但出版方实体不是分析器产物，是采集源的属性，
 * 没有理由跟着模型的冷却走，所以冷却期内走这条只增不删的路。
 *
 * 幂等：`upsert` + 固定的身份键，重跑得到同一批关联。
 */
export async function ensurePublisherEntityLinks(params: {
  tenant_id: string;
  event_id: string;
  publishers: readonly ExtractedEntity[];
}): Promise<void> {
  const wanted = dedupe(
    params.publishers.filter((entity) => !isChangelogNoiseName(entity.name)),
  ).slice(0, MAX_LINKS_PER_EVENT);
  if (wanted.length === 0) {
    return;
  }

  for (const entity of wanted) {
    const entityId = await upsertEntity(params.tenant_id, entity, {
      adopt_org_placeholder: true,
    });
    await prisma.eventEntityLink.upsert({
      where: {
        event_id_entity_id: { event_id: params.event_id, entity_id: entityId },
      },
      create: {
        tenant_id: params.tenant_id,
        event_id: params.event_id,
        entity_id: entityId,
        mention_count: entity.mention_count,
        is_publisher: true,
      },
      update: { mention_count: entity.mention_count, is_publisher: true },
    });
  }
}
