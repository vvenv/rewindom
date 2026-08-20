/* eslint-disable no-console */
/**
 * 把模板页库存标题 / 描述写回当前版式预设（含 `{event}` / `{product}` 等插值）。
 *
 * 只改「仍是某代官方默认值」的字段：空、误存的 `ns:key`、旧译名（Event / 商品 /
 * 文档详情…）、以及当前预设句。租户改过的句子不动。
 *
 * 已发布与草稿各判各的：一边改过、另一边仍是库存，只回填库存那一边。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-page-meta-presets.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-page-meta-presets.ts
 *   pnpm --filter server exec tsx scripts/backfill-page-meta-presets.ts --tenant <slug>
 *
 * 生产 app 镜像没有 pnpm/tsx，改跑同目录 `backfill-page-meta-presets.sql`
 *（postgres 容器 `psql`）。
 */
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

interface LocaleCopy {
  title: string;
  description: string;
}

interface KindSpec {
  kind: string;
  titleKey: string;
  descriptionKey: string;
  copy: Record<string, LocaleCopy>;
  retiredTitles: readonly string[];
  retiredDescriptions: readonly string[];
}

const KINDS: readonly KindSpec[] = [
  {
    kind: "events_detail",
    titleKey: "events:site.detail.title",
    descriptionKey: "events:site.detail.subtitle",
    copy: {
      en: { title: "{event}", description: "{headline}" },
      "zh-CN": { title: "{event}", description: "{headline}" },
    },
    retiredTitles: ["Event", "事件详情"],
    retiredDescriptions: [
      "What happened, how it developed, and the evidence",
      "发生了什么、怎么发展到现在、证据在哪",
    ],
  },
  {
    kind: "events_entity",
    titleKey: "events:site.entity.title",
    descriptionKey: "events:site.entity.subtitle",
    copy: {
      en: { title: "{entity}", description: "Every event involving {entity}" },
      "zh-CN": { title: "{entity}", description: "与 {entity} 相关的全部事件" },
    },
    retiredTitles: ["Entity", "实体"],
    retiredDescriptions: [
      "Every event involving this company, product or person",
      "这个公司 / 产品 / 人物涉及的全部事件",
    ],
  },
  {
    kind: "events_topic",
    titleKey: "events:site.topic.title",
    descriptionKey: "events:site.topic.subtitle",
    copy: {
      en: {
        title: "{topic}",
        description: "What's happening in {topic}, merged across sources",
      },
      "zh-CN": {
        title: "{topic}",
        description: "跨来源追踪 {topic} 正在发生的事",
      },
    },
    retiredTitles: [],
    retiredDescriptions: [],
  },
  {
    kind: "shop_product",
    titleKey: "shop:storefront.product.title",
    descriptionKey: "shop:storefront.product.subtitle",
    copy: {
      en: { title: "{product}", description: "{product_description}" },
      "zh-CN": { title: "{product}", description: "{product_description}" },
    },
    retiredTitles: ["Product", "商品"],
    retiredDescriptions: ["Product details", "商品详情"],
  },
  {
    kind: "shop_collection",
    titleKey: "shop:storefront.collection.title",
    descriptionKey: "shop:storefront.collection.subtitle",
    copy: {
      en: { title: "{collection}", description: "{collection_description}" },
      "zh-CN": { title: "{collection}", description: "{collection_description}" },
    },
    retiredTitles: ["Collection", "分类"],
    retiredDescriptions: [
      "Products in this collection",
      "该分类下的商品",
    ],
  },
  {
    kind: "shop_order",
    titleKey: "shop:storefront.order.pageTitle",
    descriptionKey: "shop:storefront.order.subtitle",
    copy: {
      en: { title: "{order}", description: "Status and tracking" },
      "zh-CN": { title: "{order}", description: "订单状态与物流" },
    },
    retiredTitles: ["Order", "订单"],
    retiredDescriptions: [],
  },
  {
    kind: "docs_article",
    titleKey: "site-docs:template.article.title",
    descriptionKey: "site-docs:template.article.description",
    copy: {
      en: { title: "{doc}", description: "{doc_description}" },
      "zh-CN": { title: "{doc}", description: "{doc_description}" },
    },
    retiredTitles: ["Doc detail", "文档详情"],
    retiredDescriptions: [
      "Layout for a single document (shared by every /docs/… address).",
      "单篇文档的版式（所有 /docs/… 地址共用）。",
    ],
  },
];

type MetaField =
  | "title"
  | "title_draft"
  | "description"
  | "description_draft";

function stockSet(
  key: string,
  retired: readonly string[],
  currents: readonly string[],
): Set<string> {
  return new Set(["", key, ...retired, ...currents]);
}

function isStock(stored: string, known: Set<string>): boolean {
  return known.has(stored.trim());
}

function expectedCopy(
  spec: KindSpec,
  locale: string,
): LocaleCopy | undefined {
  return spec.copy[locale] ?? spec.copy["zh-CN"] ?? spec.copy.en;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const tenantArg = process.argv.indexOf("--tenant");
  const tenantSlug = tenantArg >= 0 ? process.argv[tenantArg + 1] : undefined;

  const tenants = await prisma.tenant.findMany({
    where: tenantSlug ? { slug: tenantSlug } : { status: { not: "archived" } },
    select: { id: true, slug: true },
  });
  const tenantById = new Map(tenants.map((row) => [row.id, row.slug]));
  const kinds = KINDS.map((spec) => spec.kind);
  const specByKind = new Map(KINDS.map((spec) => [spec.kind, spec]));

  if (tenants.length === 0) {
    console.log(
      `[backfill-page-meta-presets] no tenants` +
        (tenantSlug ? ` (slug=${tenantSlug})` : ""),
    );
    await prisma.$disconnect();
    return;
  }

  const pages = await prisma.marketingPage.findMany({
    where: {
      kind: { in: kinds },
      tenant_id: { in: tenants.map((row) => row.id) },
    },
    select: {
      id: true,
      tenant_id: true,
      kind: true,
      slug: true,
      locale: true,
      title: true,
      title_draft: true,
      description: true,
      description_draft: true,
    },
    orderBy: [{ tenant_id: "asc" }, { kind: "asc" }, { locale: "asc" }],
  });

  let matched = 0;
  let skippedUnknownLocale = 0;
  const samples: string[] = [];

  for (const page of pages) {
    const spec = specByKind.get(page.kind);
    if (!spec) continue;
    const expected = expectedCopy(spec, page.locale);
    if (!expected) {
      skippedUnknownLocale += 1;
      continue;
    }

    const titleStock = stockSet(
      spec.titleKey,
      spec.retiredTitles,
      Object.values(spec.copy).map((item) => item.title),
    );
    const descriptionStock = stockSet(
      spec.descriptionKey,
      spec.retiredDescriptions,
      Object.values(spec.copy).map((item) => item.description),
    );

    const next: Partial<Record<MetaField, string>> = {};
    if (isStock(page.title, titleStock) && page.title !== expected.title) {
      next.title = expected.title;
    }
    if (
      isStock(page.title_draft, titleStock) &&
      page.title_draft !== expected.title
    ) {
      next.title_draft = expected.title;
    }
    if (
      isStock(page.description, descriptionStock) &&
      page.description !== expected.description
    ) {
      next.description = expected.description;
    }
    if (
      isStock(page.description_draft, descriptionStock) &&
      page.description_draft !== expected.description
    ) {
      next.description_draft = expected.description;
    }

    const changed = Object.keys(next) as MetaField[];
    if (changed.length === 0) continue;

    matched += 1;
    const tenant = tenantById.get(page.tenant_id) ?? page.tenant_id;
    const summary = changed
      .map((field) => {
        const from = page[field];
        const to = next[field] ?? "";
        return `${field}:${JSON.stringify(from)}→${JSON.stringify(to)}`;
      })
      .join(" ");
    const line = `${tenant} ${page.kind}/${page.locale} ${summary}`;
    if (samples.length < 20) samples.push(line);
    else if (samples.length === 20) samples.push("…");

    if (dryRun) continue;

    await prisma.marketingPage.update({
      where: { id: page.id, tenant_id: page.tenant_id },
      data: next,
    });
  }

  console.log(
    `[backfill-page-meta-presets] pages=${pages.length} matched=${matched} ` +
      `unknown_locale=${skippedUnknownLocale} dry_run=${dryRun}` +
      (tenantSlug ? ` tenant=${tenantSlug}` : ""),
  );
  for (const line of samples) {
    console.log(`  ${line}`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
