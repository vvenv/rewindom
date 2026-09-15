/**
 * 实体共现——「这家常和谁一起出现」。
 *
 * 与事件页的 Related Events 对称，但数据源不同：相关事件靠 centroid 语义相似度
 * （预计算，因为载入向量贵）；相关实体靠 EventEntityLink 自连接——同一件事里
 * 还出现了谁。那是可核对的计数，不是「猜你喜欢」。
 *
 * 读路径上算，不预计算、不加列：groupBy 轻量，且实体页是低频页面（vs 详情页
 * 每次刷新）。与 entity-profile 同一条理由——档案也是读路径上算的。
 *
 * 同一条硬约束：只报计数，不写「这两家关系密切」这类判断——那是解读，不是事实。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

/** 少于 2 个共现事件时跳过该实体——「和它一起出现过 1 次」是噪音。与 entity-profile MIN_EVENTS 同口径。 */
const MIN_COOCCURRENCE = 2;
/** 实体页放得下的条数。再多就该是一个列表页，而实体页不是列表页。与 RELATED_LIMIT 对称。 */
const LIMIT = 5;

export interface CoOccurringEntity {
  slug: string;
  name: string;
  kind: string;
  /** 与当前实体在同一事件里共现过几次（COUNT DISTINCT event_id） */
  co_occurrence_count: number;
}

/**
 * 取与当前实体共现过的其他实体，按共现事件数降序。
 *
 * 三步走：先取当前实体关联的事件 id 集合（与事件列表同一个 event_filter），
 * 再 groupBy 算这些事件里其他实体的共现次数，最后取展示信息。
 * 不用一次原始查询 + 应用层聚合——groupBy 在库里做更省传输。
 */
export async function getEntityCoOccurrence(params: {
  tenant_id: string;
  entity_id: string;
  /**
   * 与实体页事件列表同一个过滤条件（enabledTopicWhere）。
   * 档案数了 12 件、列表列 8 件、共现却引到被关掉主题的事件上，三个数对不上
   * 读者会以为页面坏了。与 entity-profile 第 3 条同一条硬约束。
   */
  event_filter: Record<string, unknown>;
}): Promise<CoOccurringEntity[]> {
  // 1. 当前实体关联的事件 id 集合（已按 event_filter 过滤）
  const links = await prisma.eventEntityLink.findMany({
    where: withTenantScope(params.tenant_id, {
      entity_id: params.entity_id,
      event: params.event_filter,
    }),
    select: { event_id: true },
  });
  const eventIds = [...new Set(links.map((link) => link.event_id))];
  if (eventIds.length === 0) {
    return [];
  }

  // 2. 这些事件里还出现了哪些其他实体，按共现事件数降序
  const groups = await prisma.eventEntityLink.groupBy({
    by: ["entity_id"],
    where: withTenantScope(params.tenant_id, {
      event_id: { in: eventIds },
      entity_id: { not: params.entity_id },
    }),
    _count: { event_id: true },
    orderBy: { _count: { event_id: "desc" } },
    take: LIMIT,
  });

  // 3. 过滤掉单次共现（噪音），取这些实体的展示信息
  const qualified = groups.filter((group) => group._count.event_id >= MIN_COOCCURRENCE);
  if (qualified.length === 0) {
    return [];
  }

  const entities = await prisma.eventEntity.findMany({
    where: withTenantScope(params.tenant_id, {
      id: { in: qualified.map((group) => group.entity_id) },
    }),
    select: { id: true, slug: true, name: true, kind: true },
  });

  // 保持 groupBy 的顺序——findMany 不保证顺序
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  return qualified.flatMap((group) => {
    const entity = byId.get(group.entity_id);
    return entity
      ? [
          {
            slug: entity.slug,
            name: entity.name,
            kind: entity.kind,
            co_occurrence_count: group._count.event_id,
          },
        ]
      : [];
  });
}
