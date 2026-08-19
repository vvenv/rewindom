/**
 * 把实体索引供给 `translation` 模块当「不要翻译的术语」。
 *
 * 访客侧翻译的术语保护**刻意不保护单个首字母大写的词**——英文句子里大写词太多，
 * 全保护等于不翻。代价是 `Bun` 会被译成「面包」、`Rust` 会被译成「锈」。
 * `EventEntity` 存的正好是需要保护的那批（`Cloudflare` / `NVIDIA` /
 * `Amazon Bedrock`），比让站长手填术语表可靠得多，也随语料自动长大。
 *
 * 按提及数取前 N 条：术语表每多一条，浏览器就多一个正则要在每段文本上跑。
 */

import { prisma } from "@rewindom/module-sdk/server";

import type { TranslationTermsProvider } from "@rewindom/module-sdk/server";

/** 上限比 translation 侧的封顶略高，让它自己按「租户手填优先」去砍。 */
const MAX_TERMS = 250;
/** 缓存 TTL。公开面每次加载都会问一次，直接查库等于给每个访客加一次聚合查询。 */
const TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  terms: string[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * 只取**被事件引用过**的实体（走 EventEntityLink），按累计提及数排序。
 *
 * 没有链接的实体是抽取出来但没进任何事件的残留，拿它们占术语表的名额不划算。
 */
async function loadTerms(tenantId: string): Promise<string[]> {
  const grouped = await prisma.eventEntityLink.groupBy({
    by: ["entity_id"],
    where: { tenant_id: tenantId },
    _sum: { mention_count: true },
    orderBy: { _sum: { mention_count: "desc" } },
    take: MAX_TERMS,
  });
  if (grouped.length === 0) return [];

  const entities = await prisma.eventEntity.findMany({
    where: { id: { in: grouped.map((row) => row.entity_id) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(entities.map((e) => [e.id, e.name]));

  const terms: string[] = [];
  const seen = new Set<string>();
  for (const row of grouped) {
    const name = nameById.get(row.entity_id)?.trim();
    // 同名不同 kind 会各存一条（Trump 既是 person 也可能是 org），按名字去重
    if (!name || name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(name);
  }
  return terms;
}

export const eventsTranslationTermsProvider: TranslationTermsProvider = {
  async getKeepTerms(tenantId) {
    const now = Date.now();
    const cached = cache.get(tenantId);
    if (cached && cached.expiresAt > now) return cached.terms;
    const terms = await loadTerms(tenantId);
    cache.set(tenantId, { terms, expiresAt: now + TTL_MS });
    return terms;
  },
};

/** 测试用。 */
export function clearTranslationTermsCache(): void {
  cache.clear();
}
