/* eslint-disable no-console */
/**
 * 把误存成 i18n key 的模板页标题 / 段文案翻成真正的句子。
 *
 * 背景：`initializeTenantSite` 曾只用 marketing 自己的 locale JSON 解预设。贡献方
 * 的 key（`site-member:login.title`、`events:site.topic.title` 等）解不开，就
 * 原样写进了 `MarketingPage` 的 title / heading。访客 / 页面设置看到的就是这些 key。
 *
 * 本脚本自带 catalog，不依赖尚未发版的 `registerLocaleCatalog`。只改「当前值
 * 仍然等于某个 ns:key」的字段；租户改过的文案不动。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-preset-i18n-keys.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-preset-i18n-keys.ts
 */
import siteBillingEn from "@rewindom/builtin/site-billing/client/locales/en.json" with { type: "json" };
import siteBillingZhCN from "@rewindom/builtin/site-billing/client/locales/zh-CN.json" with { type: "json" };
import siteMemberEn from "@rewindom/builtin/site-member/client/locales/en.json" with { type: "json" };
import siteMemberZhCN from "@rewindom/builtin/site-member/client/locales/zh-CN.json" with { type: "json" };
import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

import eventsEn from "../../../modules/events/client/locales/en.json" with { type: "json" };
import eventsZhCN from "../../../modules/events/client/locales/zh-CN.json" with { type: "json" };
import shopEn from "../../../modules/shop/client/locales/en.json" with { type: "json" };
import shopZhCN from "../../../modules/shop/client/locales/zh-CN.json" with { type: "json" };
import siteDocsEn from "../../../modules/site-docs/client/locales/en.json" with { type: "json" };
import siteDocsZhCN from "../../../modules/site-docs/client/locales/zh-CN.json" with { type: "json" };

type Catalog = Record<string, Record<string, unknown>>;

const CATALOGS: Record<string, Catalog> = {
  "site-member": {
    "zh-CN": siteMemberZhCN as Record<string, unknown>,
    en: siteMemberEn as Record<string, unknown>,
  },
  "site-billing": {
    "zh-CN": siteBillingZhCN as Record<string, unknown>,
    en: siteBillingEn as Record<string, unknown>,
  },
  shop: {
    "zh-CN": shopZhCN as Record<string, unknown>,
    en: shopEn as Record<string, unknown>,
  },
  events: {
    "zh-CN": eventsZhCN as Record<string, unknown>,
    en: eventsEn as Record<string, unknown>,
  },
  "site-docs": {
    "zh-CN": siteDocsZhCN as Record<string, unknown>,
    en: siteDocsEn as Record<string, unknown>,
  },
};

const NAMESPACED_KEY =
  /^([a-z][a-z0-9-]*):([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)$/;

function resolveMessage(
  messages: Record<string, unknown>,
  key: string,
): string | undefined {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function translateString(locale: string, value: string): string {
  const match = NAMESPACED_KEY.exec(value);
  if (!match) return value;
  const catalog = CATALOGS[match[1]!];
  if (!catalog) return value;
  const primary = catalog[locale] ?? catalog["zh-CN"];
  const fallback = catalog["zh-CN"];
  if (!primary) return value;
  return (
    resolveMessage(primary, match[2]!) ??
    (fallback && fallback !== primary
      ? resolveMessage(fallback, match[2]!)
      : undefined) ??
    value
  );
}

function translateDeep(
  locale: string,
  value: unknown,
): { next: unknown; changed: boolean } {
  if (typeof value === "string") {
    const next = translateString(locale, value);
    return { next, changed: next !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = translateDeep(locale, item);
      if (result.changed) changed = true;
      return result.next;
    });
    return { next, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const result = translateDeep(locale, item);
      if (result.changed) changed = true;
      next[key] = result.next;
    }
    return { next, changed };
  }
  return { next: value, changed: false };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const pages = await prisma.marketingPage.findMany({
    select: {
      id: true,
      tenant_id: true,
      slug: true,
      locale: true,
      kind: true,
      title: true,
      title_draft: true,
      description: true,
      description_draft: true,
      sections: true,
      sections_draft: true,
    },
    orderBy: { created_at: "asc" },
  });

  let matched = 0;
  const samples: string[] = [];

  for (const page of pages) {
    const locale = page.locale;
    const title = translateString(locale, page.title);
    const titleDraft = translateString(locale, page.title_draft);
    const description = translateString(locale, page.description);
    const descriptionDraft = translateString(locale, page.description_draft);
    const sections = translateDeep(locale, page.sections);
    const sectionsDraft = translateDeep(locale, page.sections_draft);

    const changed =
      title !== page.title ||
      titleDraft !== page.title_draft ||
      description !== page.description ||
      descriptionDraft !== page.description_draft ||
      sections.changed ||
      sectionsDraft.changed;
    if (!changed) continue;

    matched += 1;
    if (samples.length < 12) {
      samples.push(
        `${page.kind}/${page.slug} [${page.locale}] ${page.title} → ${title}`,
      );
    }

    if (dryRun) continue;

    await prisma.marketingPage.update({
      where: { id: page.id, tenant_id: page.tenant_id },
      data: {
        title,
        title_draft: titleDraft,
        description,
        description_draft: descriptionDraft,
        sections: sections.next as Prisma.InputJsonValue,
        sections_draft: sectionsDraft.next as Prisma.InputJsonValue,
      },
    });
  }

  console.log(
    `[backfill-preset-i18n-keys] pages=${pages.length} matched=${matched} dry_run=${dryRun}`,
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
