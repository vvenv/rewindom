/* eslint-disable no-console */
/**
 * 让存量实体模板页跟上「身份只画一遍」的版式。
 *
 * 背景：实体页的身份（实体名 h1 + 类型）以前画在正文段 `events.entity` 里。首屏拆出来
 * 之后同一屏说了两遍，于是正文那一份删了——**没有首屏的存量页会因此突然没有标题**。
 * 库里的存量数据要一次性接住（不做运行时兼容），这个脚本就是那一次。
 *
 * 两件事，都只在「这一份还是官方原样」时动手：
 *
 * 1. **补首屏**——「有正文段、却没有首屏段」的那一份版式；
 * 2. **换库存文案**——存量页的段设置是快照，改 setting 的 default 到不了它们。
 *    仍是上一代库存句的换成现在这一版（见 `RETIRED_COPY`）：h1 换成 `{entity}`、
 *    首屏那句产品话术换成讲这个实体的、正文的「相关事件」标题清空、首屏的竖向留白
 *    收紧。租户改过的（句子或数字）一个都不动。
 *
 * 补首屏的判定：
 *
 * - 已发布（`sections`）与草稿（`sections_draft`）各判各的——一边补过、另一边没有的
 *   页面很正常（租户改了草稿还没发布）；
 * - 空版式（一个段都没有）不动：那不是丢了标题，是这一份根本没内容，补一个孤零零的
 *   首屏反而把线上页面变成只剩一块主张；
 * - 已经有首屏的跳过。重复执行安全。
 *
 * 文案落的是整张 `__i18n` 表（与建页 / 重设版式同一条 `buildPresetSection`），
 * 不会把某一种语言钉死。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/backfill-events-entity-hero.ts --dry-run
 *   pnpm --filter server exec tsx scripts/backfill-events-entity-hero.ts
 *   pnpm --filter server exec tsx scripts/backfill-events-entity-hero.ts --tenant <slug>
 */

import { createStarterTranslator } from "@rewindom/builtin/marketing/server/starter-i18n.js";
import { buildPresetSection } from "@rewindom/builtin/marketing/shared/page-presets.js";
import { registerSectionDefinition } from "@rewindom/builtin/marketing/shared/sections/index.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { normalizeLocale } from "@rewindom/shared";

import {
  EVENTS_ENTITY_HERO_SECTION_TYPE,
  EVENTS_ENTITY_PAGE_KIND,
  EVENTS_ENTITY_SECTION_TYPE,
  eventsEntityHeroSection,
  eventsEntitySection,
} from "../../../modules/events/shared/index.js";
/* 副作用导入：把 events 的 locale catalog 登记进来，`ns:key` 才解得开 */
import "../../../modules/events/server/ssr/events-preset-i18n.js";

import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

type SectionsField = "sections" | "sections_draft";

const FIELDS: readonly SectionsField[] = ["sections", "sections_draft"];

function asSections(value: unknown): SiteSection[] | null {
  return Array.isArray(value) ? (value as SiteSection[]) : null;
}

/** 有正文、没首屏 → 就是那批丢了标题的页面。 */
function needsHero(sections: SiteSection[]): boolean {
  if (
    sections.some((section) => section.type === EVENTS_ENTITY_HERO_SECTION_TYPE)
  ) {
    return false;
  }
  return sections.some(
    (section) => section.type === EVENTS_ENTITY_SECTION_TYPE,
  );
}

/**
 * 上一代库存文案 → 现在这一版。**新句子不写在这里**：它就是段定义上的 setting
 * default，由 `buildPresetSection` 现造一份取值（一处真源，改文案不用回来改脚本）。
 * 这里只列作废的旧句——只有仍是旧句的才换，租户改过的一个字都不动。
 */
const RETIRED_COPY: readonly {
  section: string;
  setting: string;
  retired: readonly (string | number)[];
}[] = [
  {
    // 那时正文画着实体名，首屏这句讲「这一页是什么」；现在 h1 就是实体名
    section: EVENTS_ENTITY_HERO_SECTION_TYPE,
    setting: "headline",
    retired: ["与 {entity} 相关的全部事件", "Every event involving {entity}"],
  },
  {
    // 讲页面的产品话术 → 讲这个实体：下面是什么、怎么排的
    section: EVENTS_ENTITY_HERO_SECTION_TYPE,
    setting: "subhead",
    retired: [
      "事件一天就凉，这一页是长期可回访的记录。",
      "Events go cold in a day. This page is the lasting record.",
    ],
  },
  {
    // 这一页只有这一个列表，标题清空（新 default 就是空）
    section: EVENTS_ENTITY_SECTION_TYPE,
    setting: "events_label",
    retired: ["相关事件", "Related events"],
  },
  /*
   * 留白也是文案的一部分：正文段默认不画标题之后，72 的下边距加上正文段的 48
   * 会在按钮和第一张卡片之间空出 120px 的无人区。数字与句子同一条规则——
   * 只有仍是那一代默认值的才换。
   */
  {
    section: EVENTS_ENTITY_HERO_SECTION_TYPE,
    setting: "padding_top",
    retired: [72],
  },
  {
    section: EVENTS_ENTITY_HERO_SECTION_TYPE,
    setting: "padding_bottom",
    retired: [72],
  },
];

interface I18nTable {
  __i18n: Record<string, string>;
}

function tableOf(value: unknown): Record<string, string> | null {
  const table = (value as Partial<I18nTable> | null)?.__i18n;
  return table && typeof table === "object" ? table : null;
}

/** 现造的那一份里，这条 setting 在某语言下的值（数字没有语言之分）。 */
function freshValue(fresh: unknown, locale: string): string | number {
  const table = tableOf(fresh);
  if (table) return table[locale] ?? table["zh-CN"] ?? "";
  return typeof fresh === "string" || typeof fresh === "number" ? fresh : "";
}

/**
 * 仍是库存句就换成新句，否则返回 null（= 这一条不动）。
 *
 * 值可能是普通字符串，也可能是整张 `__i18n` 表——逐语言判，一种语言改过、另一种
 * 还是库存句的页面很常见（改中文时英文那份没人动）。整表都成空串时收成 `""`，
 * 免得库里留一张全是空值的表。
 */
function retire(
  value: unknown,
  retired: readonly (string | number)[],
  fresh: unknown,
  pageLocale: string,
): unknown | null {
  const stale = (text: unknown): boolean =>
    typeof text === "number"
      ? retired.includes(text)
      : typeof text === "string" && retired.includes(text.trim());

  if (typeof value === "number" || typeof value === "string") {
    return stale(value) ? freshValue(fresh, pageLocale) : null;
  }

  const table = tableOf(value);
  if (!table) return null;
  let changed = false;
  const next: Record<string, string> = {};
  for (const [locale, text] of Object.entries(table)) {
    next[locale] = stale(text) ? String(freshValue(fresh, locale)) : text;
    changed ||= stale(text);
  }
  if (!changed) return null;
  return Object.values(next).every((text) => !text) ? "" : { __i18n: next };
}

/** 返回改过的段数组；没有一段要改时返回 null（调用方据此跳过这一份版式）。 */
function withRetiredCopy(
  sections: SiteSection[],
  fresh: (type: string) => SiteSection,
  pageLocale: string,
): SiteSection[] | null {
  let changed = false;
  const next = sections.map((section) => {
    const specs = RETIRED_COPY.filter((spec) => spec.section === section.type);
    if (specs.length === 0) return section;
    const settings = { ...section.settings };
    let touched = false;
    for (const spec of specs) {
      const value = retire(
        settings[spec.setting],
        spec.retired,
        fresh(section.type).settings?.[spec.setting],
        pageLocale,
      );
      if (value === null) continue;
      settings[spec.setting] = value as never;
      touched = true;
    }
    if (!touched) return section;
    changed = true;
    return { ...section, settings };
  });
  return changed ? (next as SiteSection[]) : null;
}

async function main(): Promise<void> {
  /*
   * 段定义注册表是**进程级**的，平时由模块装配填好；脚本里没有装配，得自己登记，
   * 否则 `buildPresetSection` 认不出这个 type，直接抛。
   */
  registerSectionDefinition(eventsEntityHeroSection);
  registerSectionDefinition(eventsEntitySection);

  const dryRun = process.argv.includes("--dry-run");
  const tenantArg = process.argv.indexOf("--tenant");
  const tenantSlug = tenantArg >= 0 ? process.argv[tenantArg + 1] : undefined;

  const tenantId = tenantSlug
    ? (
        await prisma.tenant.findFirst({
          where: { slug: tenantSlug },
          select: { id: true },
        })
      )?.id
    : undefined;
  if (tenantSlug && !tenantId) {
    console.error(`[backfill-events-entity-hero] 找不到租户 ${tenantSlug}`);
    process.exitCode = 1;
    return;
  }

  const pages = await prisma.marketingPage.findMany({
    where: {
      kind: EVENTS_ENTITY_PAGE_KIND,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    select: {
      id: true,
      tenant_id: true,
      locale: true,
      sections: true,
      sections_draft: true,
    },
  });

  console.log(
    `[backfill-events-entity-hero] pages=${pages.length} dry_run=${dryRun}`,
  );

  let touched = 0;
  for (const page of pages) {
    const t = createStarterTranslator(normalizeLocale(page.locale));
    const data: Partial<Record<SectionsField, SiteSection[]>> = {};
    const notes: string[] = [];
    for (const field of FIELDS) {
      const sections = asSections(page[field]);
      if (!sections) continue;
      if (needsHero(sections)) {
        // 两份版式各建一次：section id 是 uuid，同一个 id 出现在两份里，编辑器按 id 定位会串
        const hero = buildPresetSection(
          { type: EVENTS_ENTITY_HERO_SECTION_TYPE },
          t,
        );
        data[field] = [hero, ...sections];
        notes.push(`${field} 补首屏`);
        continue;
      }
      const retired = withRetiredCopy(
        sections,
        (type) => buildPresetSection({ type }, t),
        normalizeLocale(page.locale),
      );
      if (!retired) continue;
      data[field] = retired;
      notes.push(`${field} 换库存文案`);
    }
    if (notes.length === 0) continue;

    touched += 1;
    console.log(`  ${page.tenant_id} ${page.locale} ← ${notes.join(" / ")}`);
    if (dryRun) continue;
    await prisma.marketingPage.update({
      where: { id: page.id },
      data: data as never,
    });
  }

  console.log(
    `[backfill-events-entity-hero] ${dryRun ? "会改" : "已改"} ${touched} 张页面`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
