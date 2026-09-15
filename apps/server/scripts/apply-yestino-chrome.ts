/* eslint-disable no-console */
/**
 * 整理 Yestino 页头 / 页脚：
 *
 * 1. 页头主题导航里的 `/about` 挪走（关于是站点页，不该跟主题挤一排）
 * 2. 页脚一行：左版权，右「关于 · 隐私」
 * 3. 页脚不再放 RSS（首屏已经有订阅入口）
 *
 * 徽章段不动。幂等：已经是这个布局就跳过。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/apply-yestino-chrome.ts --dry-run
 *   pnpm --filter server exec tsx scripts/apply-yestino-chrome.ts
 *   pnpm --filter server exec tsx scripts/apply-yestino-chrome.ts --from-json chrome.json --dump-sql
 */

import { readFileSync } from "node:fs";

import { createBlock } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { parseNavItems } from "@rewindom/builtin/marketing/shared/site-nav.js";
import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { type AppLocale } from "@rewindom/shared";

import type { LocalizedText } from "@rewindom/builtin/marketing/shared/section-settings.js";
import type {
  SiteBlock,
  SiteSection,
} from "@rewindom/builtin/marketing/shared/sections/index.js";

const ABOUT_PATH = "/about";
const PRIVACY_PATH = "/privacy";
const LEGAL_HREFS = new Set([ABOUT_PATH, PRIVACY_PATH]);
const RSS_BLOCK_TYPE = "events.subscribe-link";

interface Args {
  slug: string;
  dryRun: boolean;
  force: boolean;
  fromJson: string;
  dumpSql: boolean;
}

function parseArgs(argv: string[]): Args {
  let slug = "yestino";
  let dryRun = false;
  let force = false;
  let fromJson = "";
  let dumpSql = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--force") {
      force = true;
      continue;
    }
    if (token === "--dump-sql") {
      dumpSql = true;
      continue;
    }
    if (token === "--from-json" && i + 1 < argv.length) {
      fromJson = (argv[i + 1] ?? "").trim();
      i += 1;
      continue;
    }
    if (token === "--slug" && i + 1 < argv.length) {
      slug = (argv[i + 1] ?? "").trim();
      i += 1;
    }
  }
  if (!slug) throw new Error("需要 --slug <tenant-slug>");
  return { slug, dryRun, force, fromJson, dumpSql };
}

function i18n(values: Record<AppLocale, string>): LocalizedText {
  return { __i18n: { ...values } };
}

function asSections(value: unknown): SiteSection[] {
  return Array.isArray(value) ? (value as SiteSection[]) : [];
}

function itemHref(entry: unknown): string {
  if (!entry || typeof entry !== "object") return "";
  const href = (entry as { href?: unknown }).href;
  return typeof href === "string" ? href : "";
}

function navItems(block: SiteBlock): unknown[] {
  const items = block.settings?.items;
  return Array.isArray(items) ? items : [];
}

function isLegalNavBlock(block: SiteBlock): boolean {
  if (block.type !== "chrome_nav") return false;
  const items = navItems(block);
  if (items.length === 0) return false;
  return items.every((entry) => LEGAL_HREFS.has(itemHref(entry)));
}

function headerHasAbout(sections: readonly SiteSection[]): boolean {
  return sections.some((section) =>
    (section.blocks ?? []).some((block) =>
      navItems(block).some((entry) => itemHref(entry) === ABOUT_PATH),
    ),
  );
}

function footerNeedsRewrite(sections: readonly SiteSection[]): boolean {
  const footer = sections.find((section) => section.type === "footer");
  if (!footer) return false;
  const blocks = footer.blocks ?? [];
  const hasRss = blocks.some((block) => block.type === RSS_BLOCK_TYPE);
  const legal = blocks.filter(isLegalNavBlock);
  const legalOk =
    legal.length === 1 &&
    navItems(legal[0]!).length === 2 &&
    legal[0]?.settings?.align === "end" &&
    !blocks.some(
      (block) => isLegalNavBlock(block) && block.settings?.align === "center",
    );
  return hasRss || !legalOk;
}

function stripAboutFromNav(sections: SiteSection[]): SiteSection[] {
  return sections.map((section) => ({
    ...section,
    blocks: (section.blocks ?? []).map((block) => {
      if (block.type !== "chrome_nav") return block;
      const items = navItems(block).filter(
        (entry) => itemHref(entry) !== ABOUT_PATH,
      );
      if (items.length === navItems(block).length) return block;
      return {
        ...block,
        settings: { ...block.settings, items },
      };
    }),
  }));
}

function buildLegalNavBlock(): SiteBlock {
  return createBlock("footer", "chrome_nav", {
    row: "1",
    align: "end",
    mobile: "pin",
    display: "inline",
    items: parseNavItems([
      {
        href: ABOUT_PATH,
        label: i18n({ "zh-CN": "关于", en: "About" }),
      },
      {
        href: PRIVACY_PATH,
        label: i18n({ "zh-CN": "隐私", en: "Privacy" }),
      },
    ]),
  });
}

function rewriteFooter(sections: SiteSection[]): SiteSection[] {
  const legal = buildLegalNavBlock();
  return sections.map((section) => {
    if (section.type !== "footer") return section;
    const kept = (section.blocks ?? []).filter(
      (block) => block.type !== RSS_BLOCK_TYPE && !isLegalNavBlock(block),
    );
    return { ...section, blocks: [...kept, legal] };
  });
}

function sameChrome(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface ChromeSnapshot {
  nav_json: unknown;
  nav_draft_json: unknown;
  footer_json: unknown;
  footer_draft_json: unknown;
}

function transformChrome(snapshot: ChromeSnapshot): ChromeSnapshot {
  return {
    nav_json: stripAboutFromNav(asSections(snapshot.nav_json)),
    nav_draft_json: stripAboutFromNav(asSections(snapshot.nav_draft_json)),
    footer_json: rewriteFooter(asSections(snapshot.footer_json)),
    footer_draft_json: rewriteFooter(asSections(snapshot.footer_draft_json)),
  };
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/gu, "''")}'`;
}

function emitUpdateSql(slug: string, next: ChromeSnapshot): void {
  process.stdout.write(`BEGIN;
UPDATE "MarketingSite" AS s
SET
  nav_json = ${sqlLiteral(JSON.stringify(next.nav_json))}::jsonb,
  nav_draft_json = ${sqlLiteral(JSON.stringify(next.nav_draft_json))}::jsonb,
  footer_json = ${sqlLiteral(JSON.stringify(next.footer_json))}::jsonb,
  footer_draft_json = ${sqlLiteral(JSON.stringify(next.footer_draft_json))}::jsonb,
  updated_at = NOW()
FROM "Tenant" t
WHERE s.tenant_id = t.id AND t.slug = ${sqlLiteral(slug)};
COMMIT;
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.fromJson) {
    const snapshot = JSON.parse(
      readFileSync(args.fromJson, "utf8"),
    ) as ChromeSnapshot;
    emitUpdateSql(args.slug, transformChrome(snapshot));
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: args.slug },
    select: { id: true, slug: true, status: true },
  });
  if (!tenant) throw new Error(`租户不存在: ${args.slug}`);
  if (tenant.status !== "active") {
    throw new Error(`租户未启用: ${args.slug}`);
  }

  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: tenant.id },
    select: {
      nav_json: true,
      nav_draft_json: true,
      footer_json: true,
      footer_draft_json: true,
    },
  });
  if (!site) throw new Error("站点记录不存在");

  const navPublished = asSections(site.nav_json);
  const navDraft = asSections(site.nav_draft_json);
  const footerPublished = asSections(site.footer_json);
  const footerDraft = asSections(site.footer_draft_json);

  const nextNavPublished = stripAboutFromNav(navPublished);
  const nextNavDraft = stripAboutFromNav(navDraft);
  const nextFooterPublished = rewriteFooter(footerPublished);
  const nextFooterDraft = rewriteFooter(footerDraft);

  const headerDirty =
    headerHasAbout(navPublished) || headerHasAbout(navDraft);
  const footerDirty =
    footerNeedsRewrite(footerPublished) || footerNeedsRewrite(footerDraft);
  const changed =
    !sameChrome(navPublished, nextNavPublished) ||
    !sameChrome(navDraft, nextNavDraft) ||
    !sameChrome(footerPublished, nextFooterPublished) ||
    !sameChrome(footerDraft, nextFooterDraft);

  if (!changed && !args.force) {
    console.log("[chrome] 页头 / 页脚已是目标布局，跳过");
    return;
  }
  if (args.dryRun) {
    console.log(
      `[chrome] 将${headerDirty ? "从页头移走 /about" : "保持页头"}，${
        footerDirty ? "重铺页脚（关于+隐私，去掉 RSS）" : "保持页脚"
      }`,
    );
    return;
  }

  await prisma.marketingSite.update({
    where: { tenant_id: tenant.id },
    data: {
      nav_json: nextNavPublished as unknown as Prisma.InputJsonValue,
      nav_draft_json: nextNavDraft as unknown as Prisma.InputJsonValue,
      footer_json: nextFooterPublished as unknown as Prisma.InputJsonValue,
      footer_draft_json: nextFooterDraft as unknown as Prisma.InputJsonValue,
    },
  });
  console.log("[chrome] 已更新页头 / 页脚");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
