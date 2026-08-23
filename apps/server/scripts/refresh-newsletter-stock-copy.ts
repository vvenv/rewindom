/* eslint-disable no-console */
/**
 * 存量订阅页里那句**过时的出厂文案** → 现在这一版。
 *
 * 背景：订阅页的副标题以前写着「新的进展**按你选的周期**送到」，但读者在那张页上
 * 根本没有选周期的地方——周期是租户在段设置里定的（`cadence`），表单上只有一个
 * 邮箱输入框。这是一句会让人找按钮找不到的话。
 *
 * 源文件里的库存文案改了（`client/locales/*.json`），但**建过页的站点不会被回灌**：
 * 模板页在创建时就把库存句展开成 `__i18n` 整表存进了 `MarketingPage`
 *（见 `page-presets.ts`），改预设对已存在的页面不生效。这个脚本就是那一次接住。
 *
 * 只在**逐字等于旧出厂句**时才改：租户自己写过的一律不碰。页面标题 / 描述与订阅段的
 * 副标题各判各的，已发布与草稿也各判各的（改了草稿还没发布很常见）。
 *
 * 重复执行安全：改过的句子不再等于旧句，第二遍什么都不做。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/refresh-newsletter-stock-copy.ts --dry-run
 *   pnpm --filter server exec tsx scripts/refresh-newsletter-stock-copy.ts
 *   pnpm --filter server exec tsx scripts/refresh-newsletter-stock-copy.ts --tenant <slug>
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

const TAG = "[refresh-newsletter-stock-copy]";

const SUBSCRIBE_PAGE_KIND = "newsletter_subscribe";
const SUBSCRIBE_SECTION_TYPE = "newsletter.subscribe";

/** 旧出厂句 → 新出厂句，按语言。左边逐字匹配，匹配不上就不动。 */
const REPLACEMENTS: Record<string, string> = {
  "留个邮箱，新的进展按你选的周期送到。不需要注册账号，随时可退订。":
    "留个邮箱，新的进展就送到你的收件箱。不需要注册账号，随时可退订。",
  "Leave your email and new items arrive on the schedule you pick. No account needed, unsubscribe any time.":
    "Leave your email and new developments land in your inbox. No account needed, unsubscribe anytime.",
};

function replaceText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = REPLACEMENTS[value];
  return next && next !== value ? next : null;
}

/** `__i18n` 整表里逐条替换；一条都没换到就返回 null，免得白写一次库。 */
function replaceI18nTable(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const table = (value as { __i18n?: unknown }).__i18n;
  if (!table || typeof table !== "object") return null;

  let changed = false;
  const next: Record<string, string> = {};
  for (const [locale, text] of Object.entries(
    table as Record<string, unknown>,
  )) {
    const replaced = replaceText(text);
    next[locale] = replaced ?? (typeof text === "string" ? text : "");
    if (replaced) changed = true;
  }
  return changed ? { __i18n: next } : null;
}

/** 订阅段的副标题。返回新的 sections 数组，或 null 表示这一份不用改。 */
function replaceInSections(sections: unknown): unknown[] | null {
  if (!Array.isArray(sections)) return null;

  let changed = false;
  const next = sections.map((section) => {
    if (
      !section ||
      typeof section !== "object" ||
      (section as { type?: unknown }).type !== SUBSCRIBE_SECTION_TYPE
    ) {
      return section;
    }
    const settings = (section as { settings?: unknown }).settings;
    if (!settings || typeof settings !== "object") return section;

    const subheading = (settings as Record<string, unknown>).subheading;
    const replaced =
      replaceI18nTable(subheading) ??
      (replaceText(subheading) as unknown as Record<string, unknown> | null);
    if (!replaced) return section;

    changed = true;
    return {
      ...section,
      settings: {
        ...(settings as Record<string, unknown>),
        subheading: replaced,
      },
    };
  });

  return changed ? next : null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const tenantIndex = process.argv.indexOf("--tenant");
  const tenantSlug =
    tenantIndex >= 0 ? process.argv[tenantIndex + 1] : undefined;

  const tenantId = tenantSlug
    ? (await prisma.tenant.findUnique({ where: { slug: tenantSlug } }))?.id
    : undefined;
  if (tenantSlug && !tenantId) {
    console.error(`${TAG} 找不到租户：${tenantSlug}`);
    process.exitCode = 1;
    return;
  }

  const pages = await prisma.marketingPage.findMany({
    where: {
      kind: SUBSCRIBE_PAGE_KIND,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    select: {
      id: true,
      tenant_id: true,
      locale: true,
      description: true,
      description_draft: true,
      sections: true,
      sections_draft: true,
    },
  });

  let touched = 0;
  for (const page of pages) {
    const data: Record<string, unknown> = {};

    const description = replaceText(page.description);
    if (description) data.description = description;
    const descriptionDraft = replaceText(page.description_draft);
    if (descriptionDraft) data.description_draft = descriptionDraft;

    const sections = replaceInSections(page.sections);
    if (sections) data.sections = sections;
    const sectionsDraft = replaceInSections(page.sections_draft);
    if (sectionsDraft) data.sections_draft = sectionsDraft;

    if (Object.keys(data).length === 0) continue;
    touched += 1;
    console.log(
      `${TAG} ${dryRun ? "[dry-run] " : ""}${page.tenant_id} / ${page.locale}：${Object.keys(data).join("、")}`,
    );
    if (dryRun) continue;
    await prisma.marketingPage.update({ where: { id: page.id }, data });
  }

  console.log(
    `${TAG} 共 ${pages.length} 张订阅页，${touched} 张${dryRun ? "待更新" : "已更新"}`,
  );
}

main()
  .catch((error) => {
    console.error(TAG, error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
