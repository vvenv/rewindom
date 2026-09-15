/* eslint-disable no-console */
/**
 * 给官网补 AdSense / 欧洲法规同意窗需要的隐私政策页（纯 CMS 内容）。
 *
 * 1. `/privacy`（中英各一张，直接发布）——含 Cookie 与 Google 广告说明
 *
 * 页脚入口由 `apply-yestino-chrome.ts` 统一铺。幂等：已存在则跳过；`--force` 覆盖正文。
 *
 * 用法:
 *   pnpm --filter server exec tsx scripts/apply-yestino-privacy.ts --dry-run
 *   pnpm --filter server exec tsx scripts/apply-yestino-privacy.ts
 *   pnpm --filter server exec tsx scripts/apply-yestino-privacy.ts --slug yestino --force
 *   pnpm --filter server exec tsx scripts/apply-yestino-privacy.ts --contact privacy@example.com
 *   pnpm --filter server exec tsx scripts/apply-yestino-privacy.ts --dump-sql
 */

import {
  createPage,
  setPageStatus,
} from "@rewindom/builtin/marketing/server/site.service.js";
import {
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { type Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { type AppLocale } from "@rewindom/shared";

import type { SettingValues } from "@rewindom/builtin/marketing/shared/section-settings.js";

const LOCALES: readonly AppLocale[] = ["zh-CN", "en"];
const PRIVACY_SLUG = "privacy";
const PRIVACY_PATH = "/privacy";
const UPDATED_ON = "2026-09-15";

interface Args {
  slug: string;
  dryRun: boolean;
  force: boolean;
  contact: string;
  dumpSql: boolean;
}

function parseArgs(argv: string[]): Args {
  let slug = "yestino";
  let dryRun = false;
  let force = false;
  let contact = "";
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
  return { slug, dryRun, force, contact, dumpSql };
}

const PRIVACY_TITLE: Record<AppLocale, string> = {
  "zh-CN": "隐私政策",
  en: "Privacy policy",
};

const PRIVACY_DESCRIPTION: Record<AppLocale, string> = {
  "zh-CN":
    "Yestino 如何处理访问日志、外观偏好，以及 Google AdSense 用于展示广告的 Cookie 与数据。",
  en: "How Yestino handles access logs, appearance preferences, and the cookies and data Google AdSense uses to show ads.",
};

const PRIVACY_BODY: Record<AppLocale, string> = {
  "zh-CN": `本政策说明 [Yestino](/)（yestino.com）如何处理你访问本站时产生的信息。公开阅读事件雷达**不需要账号**。最后更新：${UPDATED_ON}。

## 我们是谁

Yestino 是一台事件雷达：扫描公开来源、把同一件事的报道合成一个事件、重建时间线。本站由 Yestino 运营。

## 我们处理哪些信息

**服务器日志。** 访问页面时，托管环境会记下 IP 地址、浏览器、时间与请求的网址。用来保证站点运行、排查故障、防止滥用。我们不用这些日志给你做画像，也不把它们卖给任何人。

**外观偏好。** 明暗模式存在你自己的浏览器本地存储（localStorage）里，不会发到我们的服务器。

**RSS。** 订阅整站或某个主题的 feed 不需要账号，也不额外写 Cookie。

**你点出去的来源。** 事件页上的来源链接会离开本站。那些网站有各自的隐私政策，我们管不到。

## Cookie 与广告

本站使用 **Google AdSense** 展示广告。Google 可能使用 Cookie 或类似技术来：

- 衡量广告是否被看到或点击
- 在法律允许的地方提供个性化广告
- 限制同一广告反复出现

欧洲经济区、英国与瑞士的访客会先看到 Google 的同意消息（AdSense Privacy & messaging）。在你作出选择之前，Google 不应投放依赖同意的个性化广告。

你可以随时：

- 在同意消息里管理选项（若你所在地区会显示）
- 使用 [Google 广告设置](https://www.google.com/settings/ads) 控制 Google 广告个性化
- 阅读 [Google 隐私政策](https://policies.google.com/privacy) 与 [Google 如何使用广告 Cookie](https://policies.google.com/technologies/ads)

本页**不加载**广告脚本，这样你读政策时不必先面对广告或同意窗。

我们不经营自己的广告网络，也不把你的资料卖给广告商。广告数据由 Google 按其政策处理。

## 我们不收集什么

公开阅读不要求姓名、邮箱或账号。我们没有为浏览事件而建的会员档案。

## 保留

访问日志只保留运维所需的时间。广告 Cookie 的保留期由 Google 决定。

## 你的权利

如果你在欧洲经济区、英国或瑞士，你可能有权了解、更正、删除与广告相关的个人数据，或撤回同意。广告相关请求请通过上面的 Google 广告设置与 Google 隐私权工具提出。

## 儿童

本站面向一般读者，不主动收集儿童的个人数据。

## 变更

政策更新会改本页的「最后更新」日期。重大变更我们会尽量在本页写清楚。`,
  en: `This policy explains how [Yestino](/) (yestino.com) handles information from your visit. You can read the event radar **without an account**. Last updated: ${UPDATED_ON}.

## Who we are

Yestino is an event radar: it scans public sources, merges reports of the same story into one event, and rebuilds a timeline. This site is operated by Yestino.

## Information we process

**Server logs.** When you load a page, the hosting environment records an IP address, browser, time, and the URL you requested. We use this to keep the site running, debug failures, and stop abuse. We do not profile you from these logs, and we do not sell them.

**Appearance.** Light / dark mode is stored in your browser (localStorage) and is not sent to our servers.

**RSS.** Subscribing to the site or a topic feed does not require an account and does not set extra cookies.

**Outbound sources.** Source links on an event page leave this site. Those publishers have their own privacy policies.

## Cookies and ads

This site uses **Google AdSense** to show ads. Google may use cookies or similar technologies to:

- measure whether ads were shown or clicked
- show personalised ads where the law allows
- limit how often you see the same ad

Visitors in the European Economic Area, the United Kingdom, and Switzerland see Google's consent message (AdSense Privacy & messaging) first. Until you choose, Google should not serve personalised ads that depend on that consent.

You can:

- manage choices in the consent message when it is shown in your region
- use [Google Ads Settings](https://www.google.com/settings/ads) to control Google ad personalisation
- read the [Google Privacy Policy](https://policies.google.com/privacy) and [how Google uses advertising cookies](https://policies.google.com/technologies/ads)

This page **does not load** the ads script, so you can read the policy without ads or a consent prompt.

We do not run our own ad network and we do not sell your information to advertisers. Ad data is processed by Google under its policies.

## What we do not collect

Public reading does not ask for a name, email, or account. We do not keep a membership profile for browsing events.

## Retention

Access logs are kept only as long as operations need them. Ad cookie retention is set by Google.

## Your rights

If you are in the EEA, the UK, or Switzerland, you may have rights to access, correct, delete, or withdraw consent for personal data used for ads. Use Google Ads Settings and Google's privacy tools for ad-related requests.

## Children

This site is for a general audience. We do not knowingly collect personal data from children.

## Changes

Updates to this policy change the "Last updated" date on this page. Material changes will be described here.`,
};

function contactBody(locale: AppLocale, contact: string): string {
  return locale === "zh-CN"
    ? `## 联系

与本政策或本站访问日志有关的问题：${contact}`
    : `## Contact

Questions about this policy or this site's access logs: ${contact}`;
}

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

function buildPrivacySections(locale: AppLocale, contact: string): SiteSection[] {
  const body = contact
    ? `${PRIVACY_BODY[locale]}\n\n${contactBody(locale, contact)}`
    : PRIVACY_BODY[locale];
  return [
    section("page-header", {}),
    section("prose", {
      body_md: body,
      padding_top: 24,
      padding_bottom: 48,
    }),
  ];
}

async function applyPrivacyPages(args: Args, tenant_id: string): Promise<void> {
  for (const locale of LOCALES) {
    const existing = await prisma.marketingPage.findFirst({
      where: withTenantScope(tenant_id, { slug: PRIVACY_SLUG, locale }),
      select: { id: true, status: true },
    });
    const sections = buildPrivacySections(locale, args.contact);

    if (existing && !args.force) {
      console.log(`[privacy] ${locale} 已存在，跳过（--force 覆盖正文）`);
      continue;
    }
    if (args.dryRun) {
      console.log(
        `[privacy] ${locale} 将${existing ? "覆盖" : "新建"} ${PRIVACY_PATH}（${sections.length} 段）`,
      );
      continue;
    }

    if (existing) {
      await prisma.marketingPage.update({
        where: { id: existing.id, tenant_id },
        data: {
          title: PRIVACY_TITLE[locale],
          description: PRIVACY_DESCRIPTION[locale],
          sections: sections as unknown as Prisma.InputJsonValue,
          title_draft: PRIVACY_TITLE[locale],
          description_draft: PRIVACY_DESCRIPTION[locale],
          sections_draft: sections as unknown as Prisma.InputJsonValue,
        },
      });
      await setPageStatus(tenant_id, existing.id, "published");
      console.log(`[privacy] ${locale} 已覆盖并发布`);
      continue;
    }

    const created = await createPage(tenant_id, {
      kind: "page",
      slug: PRIVACY_SLUG,
      locale,
      title: PRIVACY_TITLE[locale],
      description: PRIVACY_DESCRIPTION[locale],
      sections,
    });
    await setPageStatus(tenant_id, created.id, "published");
    console.log(`[privacy] ${locale} 已新建并发布 ${PRIVACY_PATH}`);
  }
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/gu, "''")}'`;
}

function emitSql(args: Args): void {
  const statements: string[] = [
    "BEGIN;",
    `SELECT id FROM "Tenant" WHERE slug = ${sqlLiteral(args.slug)};`,
  ];
  for (const locale of LOCALES) {
    const sectionsJson = JSON.stringify(
      buildPrivacySections(locale, args.contact),
    );
    statements.push(`
INSERT INTO "MarketingPage" (
  id, tenant_id, slug, locale, kind,
  title, description, sections, settings,
  title_draft, description_draft, sections_draft, settings_draft,
  visibility, status, sort_order, created_at, updated_at
)
SELECT
  gen_random_uuid(), t.id, ${sqlLiteral(PRIVACY_SLUG)}, ${sqlLiteral(locale)}, 'page',
  ${sqlLiteral(PRIVACY_TITLE[locale])},
  ${sqlLiteral(PRIVACY_DESCRIPTION[locale])},
  ${sqlLiteral(sectionsJson)}::jsonb,
  '{}'::jsonb,
  ${sqlLiteral(PRIVACY_TITLE[locale])},
  ${sqlLiteral(PRIVACY_DESCRIPTION[locale])},
  ${sqlLiteral(sectionsJson)}::jsonb,
  '{}'::jsonb,
  'public', 'published', 0, NOW(), NOW()
FROM "Tenant" t
WHERE t.slug = ${sqlLiteral(args.slug)}
ON CONFLICT (tenant_id, slug, locale) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sections = EXCLUDED.sections,
  title_draft = EXCLUDED.title_draft,
  description_draft = EXCLUDED.description_draft,
  sections_draft = EXCLUDED.sections_draft,
  status = 'published',
  updated_at = NOW();`);
  }
  statements.push("COMMIT;");
  process.stdout.write(`${statements.join("\n")}\n`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.dumpSql) {
    emitSql(args);
    return;
  }
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
    console.log("[privacy] 未传 --contact，政策页不写联系方式段");
  }

  await applyPrivacyPages(args, tenant.id);

  console.log(
    `[apply-yestino-privacy] tenant=${tenant.slug} dry_run=${args.dryRun} force=${args.force}`,
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
