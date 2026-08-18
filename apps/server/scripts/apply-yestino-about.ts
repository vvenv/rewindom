/* eslint-disable no-console */
/**
 * 给官网补三样内容（纯 CMS 内容，不动代码）：
 *
 * 1. `/about` 关于页（中英各一张，直接发布）
 * 2. 首页顶部一段说明 band（`anchor: about-yestino`），排在「正在升温」之前
 * 3. 页脚一个指向 `/about` 的导航块
 *
 * 幂等：三样各自先检测再写，已存在的跳过；`--force` 只覆盖 1、2 的正文，
 * 不会重复插入。
 *
 * 首页与页脚直接写「线上 + 草稿」两列，**不走** `publishEditorDraft`——那条链
 * 会把站点级页头页脚草稿一并推上线（见 site.service.ts 的注释）。关于页是新建
 * 的，走 `createPage` + `setPageStatus`，两列本来就一致。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/apply-yestino-about.ts --dry-run
 *   pnpm --filter server exec tsx scripts/apply-yestino-about.ts
 *   pnpm --filter server exec tsx scripts/apply-yestino-about.ts --slug default --force
 *   pnpm --filter server exec tsx scripts/apply-yestino-about.ts --contact hi@example.com
 */

import {
  createPage,
  setPageStatus,
} from "@rewindom/builtin/marketing/server/site.service.js";
import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteBlock,
  type SiteSection,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import {
  marketingPagePath,
  type MarketingPageKind,
} from "@rewindom/builtin/marketing/shared/site-cms.js";
import {
  DEFAULT_HOME_PATH,
  normalizeHomePath,
} from "@rewindom/builtin/marketing/shared/site-home.js";
import { parseNavItems } from "@rewindom/builtin/marketing/shared/site-nav.js";
import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { DEFAULT_TENANT_SLUG, type AppLocale } from "@rewindom/shared";

import { registerEventsPageTemplates } from "../../../modules/events/shared/events-page-templates.js";

import type {
  LocalizedText,
  SettingValues,
} from "@rewindom/builtin/marketing/shared/section-settings.js";

const LOCALES: readonly AppLocale[] = ["zh-CN", "en"];
const ABOUT_SLUG = "about";
const ABOUT_PATH = "/about";
/** 首页说明段的 `anchor`：既是锚点，也是这段是不是已经铺过的判据。 */
const INTRO_ANCHOR = "about-yestino";

interface Args {
  slug: string;
  dryRun: boolean;
  force: boolean;
  contact: string;
}

function parseArgs(argv: string[]): Args {
  let slug = DEFAULT_TENANT_SLUG;
  let dryRun = false;
  let force = false;
  let contact = "";
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
    if (token === "--slug" && i + 1 < argv.length) {
      slug = (argv[i + 1] ?? "").trim();
      i += 1;
      continue;
    }
    if (token === "--contact" && i + 1 < argv.length) {
      contact = (argv[i + 1] ?? "").trim();
      i += 1;
    }
  }
  if (!slug) {
    throw new Error("需要 --slug <tenant-slug>");
  }
  return { slug, dryRun, force, contact };
}

/* -------------------------------------------------------------------------- */
/* 文案                                                                        */
/* -------------------------------------------------------------------------- */

function i18n(values: Record<AppLocale, string>): LocalizedText {
  return { __i18n: { ...values } };
}

const ABOUT_TITLE: Record<AppLocale, string> = {
  "zh-CN": "关于 Yestino",
  en: "About Yestino",
};

const ABOUT_DESCRIPTION: Record<AppLocale, string> = {
  "zh-CN":
    "Yestino 是一台事件雷达：跨来源发现同一件事、合并成一个事件、重建时间线，并保留每一条来源作为证据。",
  en: "Yestino is an event radar: it finds the same story across sources, merges it into one event, rebuilds its timeline, and keeps every source as evidence.",
};

const ABOUT_BODY: Record<AppLocale, string> = {
  "zh-CN": `## Yestino 是什么

Yestino 是一台**事件雷达**。它持续扫描公开来源，发现同一件事的不同报道后把它们合成**一个事件**，重建这件事的时间线，并把每一条来源留在事件页上作为证据。

首页只有两段：**正在升温**是刚刚开始爆发的事情，**正在发生**是过去 24 小时内仍在持续发展的事情。顺序本身就是主张——先看正在变化的，再看正在发生的。

## 它怎么工作

1. **发现** —— 从一批公开来源持续采集。
2. **合并** —— 同一件事的多条报道按内容聚成一个事件，而不是并排列出十条。
3. **时间线** —— 按时间重建这件事的经过：什么时候发生了什么。
4. **证据** —— 每条结论都挂着它的来源链接，你可以自己点回去核对。
5. **追踪** —— 有后续时就地更新这个事件，而不是再发一条新的。

## 我们的口径

**不是热榜。** 热榜排的是「哪条内容被点得多」，Yestino 排的是「哪件事正在变化」。同一件事被十家媒体各写一遍，在这里是一个事件，不是十条。

**只显示来源原文。** 事件标题与摘要不按访客语言翻译。免费机器翻译会把专有名词译坏，一份「有时对、有时明显错」的译文比原文更糟——原文永远是准确的。界面文案本身仍然是完整多语言的。

**来源是证据，不是装饰。** 时间线上的每一条都能点回原始报道。我们不隐藏来源，也不替来源下结论。

## 订阅

整站与单个主题都提供 RSS，页头和页脚的「订阅 RSS」就是入口。`,
  en: `## What Yestino is

Yestino is an **event radar**. It continuously scans public sources, merges different reports of the same story into **one event**, rebuilds that event's timeline, and keeps every source on the page as evidence.

The homepage has two sections: **Rising** is what has just started to break out, **Now** is what is still developing over the last 24 hours. The order is the argument — what is changing first, what is happening second.

## How it works

1. **Discover** — continuous ingest from a set of public sources.
2. **Merge** — reports about the same story are clustered into a single event instead of ten items side by side.
3. **Timeline** — the event is rebuilt in order: what happened when.
4. **Evidence** — every claim carries the link it came from, so you can check it yourself.
5. **Track** — when there is a follow-up, the event is updated in place rather than posted again.

## Where we stand

**Not a trending chart.** A trending chart ranks what got clicked. Yestino ranks what is changing. Ten outlets covering the same story are one event here, not ten items.

**Source language only.** Event titles and summaries are not translated into your language. Free machine translation mangles proper nouns, and a translation that is sometimes right and sometimes visibly wrong is worse than the original. The interface itself stays fully localized.

**Sources are evidence, not decoration.** Every entry on a timeline links back to the original report.

## Subscribe

RSS is available for the whole site and for individual topics — the "Subscribe via RSS" link in the header and footer is the entry point.`,
};

/** 有联系方式才写这一段：公开页上放一个收不到信的地址比不放更糟。 */
function contactBody(locale: AppLocale, contact: string): string {
  return locale === "zh-CN"
    ? `## 纠错与联系

合并错了、时间线缺了一段、来源标错了——都欢迎告诉我们：${contact}`
    : `## Corrections and contact

Wrong merge, a missing step in a timeline, a mislabelled source — tell us: ${contact}`;
}

const INTRO_HEADLINE = i18n({
  "zh-CN": "同一件事，来自多个来源，合成一条时间线",
  en: "One story, many sources, one timeline",
});

/*
 * 一句话，不是一段——它站在事件流上方，回访者每次都要滑过它。
 * 「下面按升温 / 正在发生排列」这类话不写：紧接着的两段标题自己会说。
 */
const INTRO_BODY = i18n({
  "zh-CN":
    "把同一件事的多条报道合并成一个事件，重建它的时间线，并保留每一条来源作为证据。",
  en: "Reports about the same story are merged into one event, its timeline rebuilt, every source kept as evidence.",
});

const INTRO_CTA = i18n({ "zh-CN": "它是怎么工作的", en: "How it works" });

const FOOTER_LINK_LABEL = i18n({ "zh-CN": "关于", en: "About" });

/* -------------------------------------------------------------------------- */
/* 段 / 块构造                                                                 */
/* -------------------------------------------------------------------------- */

/** 与 `default-product-site-content.ts` 同形：默认值打底，再覆盖给定字段。 */
function section(type: string, values: SettingValues): SiteSection {
  const definition = getSectionDefinition(type);
  if (!definition) {
    throw new Error(`Unknown section type: ${type}`);
  }
  const base = createSection(type);
  return {
    ...base,
    settings: parseSettingValues(definition.settings, {
      ...base.settings,
      ...values,
    }),
    blocks: [],
  };
}

function buildAboutSections(locale: AppLocale, contact: string): SiteSection[] {
  const body = contact
    ? `${ABOUT_BODY[locale]}\n\n${contactBody(locale, contact)}`
    : ABOUT_BODY[locale];
  return [
    section("page-header", {}),
    section("prose", {
      body_md: body,
      padding_top: 24,
      padding_bottom: 48,
    }),
  ];
}

function buildIntroBand(): SiteSection {
  return section("band", {
    headline: INTRO_HEADLINE,
    body: INTRO_BODY,
    primary_label: INTRO_CTA,
    primary_href: ABOUT_PATH,
    align: "left",
    anchor: INTRO_ANCHOR,
    padding_top: 24,
    padding_bottom: 24,
  });
}

function buildFooterNavBlock(): SiteBlock {
  return createBlock("footer", "chrome_nav", {
    row: "1",
    align: "center",
    mobile: "pin",
    display: "inline",
    // 条目补全 id / source / children 再落库：读路径虽然会兜（`safeNavItems`），
    // 但库里躺着半截结构会让编辑器里的这一条看起来是坏的
    items: parseNavItems([{ href: ABOUT_PATH, label: FOOTER_LINK_LABEL }]),
  });
}

/* -------------------------------------------------------------------------- */
/* 读库容错                                                                    */
/* -------------------------------------------------------------------------- */

function asSections(value: unknown): SiteSection[] {
  return Array.isArray(value) ? (value as SiteSection[]) : [];
}

function hasIntroBand(sections: readonly SiteSection[]): boolean {
  return sections.some(
    (item) => item?.type === "band" && item?.settings?.anchor === INTRO_ANCHOR,
  );
}

function withoutIntroBand(sections: readonly SiteSection[]): SiteSection[] {
  return sections.filter(
    (item) =>
      !(item?.type === "band" && item?.settings?.anchor === INTRO_ANCHOR),
  );
}

/** 页脚里已经有指向 `/about` 的入口吗（导航条目或按钮都算）。 */
function hasAboutLink(sections: readonly SiteSection[]): boolean {
  return sections.some((item) =>
    (item?.blocks ?? []).some((block) => {
      if (block?.settings?.href === ABOUT_PATH) return true;
      const items = block?.settings?.items;
      return (
        Array.isArray(items) &&
        items.some(
          (entry) =>
            typeof entry === "object" &&
            entry !== null &&
            (entry as { href?: unknown }).href === ABOUT_PATH,
        )
      );
    }),
  );
}

/**
 * 只认本脚本自己铺的那一块：`chrome_nav` 且**只有** `/about` 一条。
 * 租户后来在同一块里加了别的链接，就不再是我们的块，重铺时不能删。
 */
function ownedRemoved(blocks: readonly SiteBlock[]): SiteBlock[] {
  return blocks.filter((block) => {
    if (block?.type !== "chrome_nav") return true;
    const items = block?.settings?.items;
    if (!Array.isArray(items) || items.length !== 1) return true;
    const entry = items[0] as { href?: unknown } | null;
    return entry?.href !== ABOUT_PATH;
  });
}

/* -------------------------------------------------------------------------- */
/* 三件事                                                                      */
/* -------------------------------------------------------------------------- */

async function applyAboutPages(args: Args, tenant_id: string): Promise<void> {
  for (const locale of LOCALES) {
    const existing = await prisma.marketingPage.findFirst({
      where: withTenantScope(tenant_id, { slug: ABOUT_SLUG, locale }),
      select: { id: true, status: true },
    });
    const sections = buildAboutSections(locale, args.contact);

    if (existing && !args.force) {
      console.log(`[about] ${locale} 已存在，跳过（--force 覆盖正文）`);
      continue;
    }
    if (args.dryRun) {
      console.log(
        `[about] ${locale} 将${existing ? "覆盖" : "新建"} ${ABOUT_PATH}（${sections.length} 段）`,
      );
      continue;
    }

    if (existing) {
      await prisma.marketingPage.update({
        where: { id: existing.id, tenant_id },
        data: {
          title: ABOUT_TITLE[locale],
          description: ABOUT_DESCRIPTION[locale],
          sections: sections as unknown as Prisma.InputJsonValue,
          title_draft: ABOUT_TITLE[locale],
          description_draft: ABOUT_DESCRIPTION[locale],
          sections_draft: sections as unknown as Prisma.InputJsonValue,
        },
      });
      await setPageStatus(tenant_id, existing.id, "published");
      console.log(`[about] ${locale} 已覆盖并发布`);
      continue;
    }

    const created = await createPage(tenant_id, {
      kind: "page",
      slug: ABOUT_SLUG,
      locale,
      title: ABOUT_TITLE[locale],
      description: ABOUT_DESCRIPTION[locale],
      sections,
    });
    await setPageStatus(tenant_id, created.id, "published");
    console.log(`[about] ${locale} 已新建并发布 ${ABOUT_PATH}`);
  }
}

/**
 * 访客打开 `/` 时看到的是哪一张页面。
 *
 * 不一定是 `kind: home`——`home_path` 指向别的页（本站是存量 `/events`）时，
 * 根上渲染的是那一张。说明段必须落在**真正**渲染 `/` 的那张页上。
 */
async function applyIntroBand(args: Args, tenant_id: string): Promise<void> {
  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id },
    select: { home_path: true },
  });
  const homePath = normalizeHomePath(site?.home_path ?? DEFAULT_HOME_PATH);
  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id),
    select: {
      id: true,
      kind: true,
      slug: true,
      locale: true,
      sections: true,
      sections_draft: true,
    },
  });

  const targetIds = new Set<string>();
  for (const locale of LOCALES) {
    const target = pages.find(
      (page) =>
        page.locale === locale &&
        marketingPagePath(page.kind as MarketingPageKind, page.slug) ===
          homePath,
    );
    if (!target) {
      console.log(`[intro] ${locale} 找不到 ${homePath} 对应的页面，跳过`);
      continue;
    }
    targetIds.add(target.id);
  }

  for (const page of pages) {
    const published = asSections(page.sections);
    const draft = asSections(page.sections_draft);
    const present = hasIntroBand(published) || hasIntroBand(draft);
    const label = `${page.kind}/${page.locale}`;

    // 首页换过位置：把说明段从不再渲染 `/` 的那张页上撤掉
    if (!targetIds.has(page.id)) {
      if (!present) continue;
      if (args.dryRun) {
        console.log(`[intro] 将从 ${label} 撤掉说明段（它已不是首页）`);
        continue;
      }
      await prisma.marketingPage.update({
        where: { id: page.id, tenant_id },
        data: {
          sections: withoutIntroBand(
            published,
          ) as unknown as Prisma.InputJsonValue,
          sections_draft: withoutIntroBand(
            draft,
          ) as unknown as Prisma.InputJsonValue,
        },
      });
      console.log(`[intro] 已从 ${label} 撤掉说明段`);
      continue;
    }

    if (present && !args.force) {
      console.log(`[intro] ${label} 已有说明段，跳过（--force 覆盖）`);
      continue;
    }
    if (args.dryRun) {
      console.log(
        `[intro] ${label}（${homePath}）将在顶部${present ? "替换" : "插入"}说明段`,
      );
      continue;
    }

    const band = buildIntroBand();
    await prisma.marketingPage.update({
      where: { id: page.id, tenant_id },
      data: {
        sections: [
          band,
          ...withoutIntroBand(published),
        ] as unknown as Prisma.InputJsonValue,
        sections_draft: [
          band,
          ...withoutIntroBand(draft),
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(
      `[intro] ${label}（${homePath}）说明段已${present ? "替换" : "插入"}`,
    );
  }
}

async function applyFooterLink(args: Args, tenant_id: string): Promise<void> {
  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id },
    select: { footer_json: true, footer_draft_json: true },
  });
  if (!site) {
    throw new Error("站点记录不存在");
  }
  const published = asSections(site.footer_json);
  const draft = asSections(site.footer_draft_json);
  const already = hasAboutLink(published) || hasAboutLink(draft);
  if (already && !args.force) {
    console.log("[footer] 页脚已有 /about 入口，跳过（--force 重铺）");
    return;
  }
  if (published.length === 0 || draft.length === 0) {
    console.log("[footer] 页脚为空，跳过（先在编辑器里建页脚）");
    return;
  }
  if (args.dryRun) {
    console.log(
      `[footer] 将在页脚${already ? "重铺" : "加"}一个「关于」导航块`,
    );
    return;
  }

  const block = buildFooterNavBlock();
  const append = (sections: SiteSection[]): SiteSection[] =>
    sections.map((item, index) =>
      index === 0
        ? {
            ...item,
            blocks: [...ownedRemoved(item.blocks ?? []), block],
          }
        : item,
    );

  await prisma.marketingSite.update({
    where: { tenant_id },
    data: {
      footer_json: append(published) as unknown as Prisma.InputJsonValue,
      footer_draft_json: append(draft) as unknown as Prisma.InputJsonValue,
    },
  });
  console.log("[footer] 已加「关于」导航块");
}

async function main(): Promise<void> {
  // `marketingPagePath` 要认得贡献的模板页 kind（`events_index` → `/events`）
  registerEventsPageTemplates();
  const args = parseArgs(process.argv.slice(2));
  const tenant = await prisma.tenant.findUnique({
    where: { slug: args.slug },
    select: { id: true, slug: true, status: true },
  });
  if (!tenant) {
    throw new Error(`租户不存在: ${args.slug}`);
  }
  if (tenant.status !== "active") {
    throw new Error(`租户未启用: ${args.slug}`);
  }
  if (!args.contact) {
    console.log("[about] 未传 --contact，关于页不写联系方式段");
  }

  await applyAboutPages(args, tenant.id);
  await applyIntroBand(args, tenant.id);
  await applyFooterLink(args, tenant.id);

  console.log(
    `[apply-yestino-about] tenant=${tenant.slug} dry_run=${args.dryRun} force=${args.force}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
