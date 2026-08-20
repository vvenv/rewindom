/* eslint-disable no-console */
/**
 * 清掉存量租户那些「系统预建、租户从没动过」的模板页版式（首页、会员登录/注册/账户）。
 *
 * 背景：这几张版式此前对**每个**租户预建——不打算做会员的站点，页面列表里也常驻着
 * 三张删不掉的空版式。现在它们标了 `auto_init: false`，只在租户点「初始化版式」或
 * 开通对应功能时才落库；本脚本让存量租户也回到那个起点。
 *
 * 三档判定，一档比一档松（都要求标题 / 摘要仍是预设原样）：
 *
 * | 档 | 删的是 | 用在 |
 * | --- | --- | --- |
 * | 默认 | 正文与草稿和**当前**预设逐字一致 | 建出来就没人碰过 |
 * | `--structure` | 段的结构一致（文案可能被历次回填改过） | 预设升级过、老快照对不上逐字比对 |
 * | `--all` | 不看内容 | 明知这些版式都是系统预建的，一次清干净 |
 *
 * 删掉不影响访客：没有记录时 SSR 照旧按内置预设兜底渲染。
 *
 * 用法（默认只看不动）：
 *   pnpm --filter server exec tsx scripts/cleanup-stock-template-pages.ts
 *   pnpm --filter server exec tsx scripts/cleanup-stock-template-pages.ts --apply
 *   pnpm --filter server exec tsx scripts/cleanup-stock-template-pages.ts --apply --structure
 *   pnpm --filter server exec tsx scripts/cleanup-stock-template-pages.ts --apply --tenant <slug>
 */

import marketingEn from "@rewindom/builtin/marketing/client/locales/en.json" with { type: "json" };
import marketingZhCN from "@rewindom/builtin/marketing/client/locales/zh-CN.json" with { type: "json" };
import { createStarterTranslator } from "@rewindom/builtin/marketing/server/starter-i18n.js";
import { resolveHomeLayout } from "@rewindom/builtin/marketing/shared/home-layouts.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";
import {
  getPageTemplatePreset,
  HOME_PAGE_KIND,
  isPageTemplateAutoInit,
  isStockTemplateDescription,
  isStockTemplateTitle,
  listPageTemplateKinds,
} from "@rewindom/builtin/marketing/shared/page-templates.js";
import siteMemberEn from "@rewindom/builtin/site-member/client/locales/en.json" with { type: "json" };
import siteMemberZhCN from "@rewindom/builtin/site-member/client/locales/zh-CN.json" with { type: "json" };
import { registerMemberAccountSection } from "@rewindom/builtin/site-member/server/member-account-section.js";
import { registerMemberAuthSections } from "@rewindom/builtin/site-member/server/member-auth-section.js";
import { registerMemberPageTemplates } from "@rewindom/builtin/site-member/shared/member-page-templates.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { normalizeLocale, registerLocaleCatalog } from "@rewindom/shared";

async function main(): Promise<void> {
  /*
   * 模板注册表与 locale catalog 都是**进程级**的，平时由模块装配填好。脚本里没有
   * 装配，得自己登记：catalog 缺了，「标题还是不是预设原样」一律答不上来，
   * 于是什么都删不掉。
   */
  registerLocaleCatalog("marketing", {
    "zh-CN": marketingZhCN as Record<string, unknown>,
    en: marketingEn as Record<string, unknown>,
  });
  registerLocaleCatalog("site-member", {
    "zh-CN": siteMemberZhCN as Record<string, unknown>,
    en: siteMemberEn as Record<string, unknown>,
  });
  registerMemberPageTemplates();
  // 段定义同理：预设里的 `site-member.login-form` 等要能建出来才比得了
  registerMemberAuthSections();
  registerMemberAccountSection();

  const apply = process.argv.includes("--apply");
  const all = process.argv.includes("--all");
  const structureOnly = process.argv.includes("--structure");
  const tenantArg = process.argv.indexOf("--tenant");
  const tenantSlug = tenantArg >= 0 ? process.argv[tenantArg + 1] : undefined;

  const kinds = listPageTemplateKinds()
    .filter((template) => !isPageTemplateAutoInit(template))
    .map((template) => template.kind);
  if (kinds.length === 0) {
    console.log("[cleanup-stock-template-pages] 没有 auto_init:false 的模板页");
    return;
  }

  const tenants = await prisma.tenant.findMany({
    where: tenantSlug ? { slug: tenantSlug } : undefined,
    orderBy: { created_at: "asc" },
    select: { id: true, slug: true },
  });

  console.log(
    `[cleanup-stock-template-pages] kinds=[${kinds.join(", ")}] ` +
      `tenants=${tenants.length} apply=${apply} ` +
      `mode=${all ? "all" : structureOnly ? "structure" : "exact"}`,
  );

  let removed = 0;
  let kept = 0;
  for (const tenant of tenants) {
    const site = await prisma.marketingSite.findFirst({
      where: { tenant_id: tenant.id },
      select: { home_layout_key: true },
    });
    const pages = await prisma.marketingPage.findMany({
      where: { tenant_id: tenant.id, kind: { in: kinds } },
      orderBy: [{ kind: "asc" }, { locale: "asc" }],
    });

    for (const page of pages) {
      if (
        !all &&
        !isStockSnapshot(page, site?.home_layout_key, structureOnly)
      ) {
        kept += 1;
        console.log(
          `  keep   ${tenant.slug} ${page.kind}/${page.locale}（改过，保留）`,
        );
        continue;
      }
      removed += 1;
      console.log(`  remove ${tenant.slug} ${page.kind}/${page.locale}`);
      if (apply) {
        await prisma.marketingPage.delete({
          where: { id: page.id, tenant_id: tenant.id },
        });
      }
    }
  }

  console.log(
    `[cleanup-stock-template-pages] ${apply ? "removed" : "would remove"}=${removed} kept=${kept}`,
  );
  if (!apply && removed > 0) {
    console.log("  加 --apply 才真的删。");
  }
  await prisma.$disconnect();
}

/** 这一行是不是「系统建出来的那一套」：标题 / 摘要仍是预设原样，正文与草稿也还是它。 */
function isStockSnapshot(
  page: {
    kind: string;
    locale: string;
    title: string;
    description: string;
    sections: unknown;
    sections_draft: unknown;
  },
  homeLayoutKey: string | null | undefined,
  structureOnly: boolean,
): boolean {
  if (!isStockTemplateTitle(page.kind, page.title)) return false;
  if (!isStockTemplateDescription(page.kind, page.description)) return false;

  const preset =
    page.kind === HOME_PAGE_KIND
      ? resolveHomeLayout(homeLayoutKey ?? undefined).preset
      : getPageTemplatePreset(page.kind);
  if (!preset) return false;

  const t = createStarterTranslator(normalizeLocale(page.locale));
  const built = buildPresetSections(preset, t);
  const fingerprint = structureOnly ? structure : shape;
  const expected = fingerprint(built);
  return (
    fingerprint(page.sections) === expected &&
    fingerprint(page.sections_draft) === expected
  );
}

/**
 * 逐字指纹：段的 `id` 是建出来时随机生成的、键序也不保证，比对前都得抹平，
 * 否则每一行都「不一样」。
 */
function shape(value: unknown): string {
  return JSON.stringify(strip(value));
}

/**
 * 结构指纹：只看段与块的 type 列表。
 *
 * 用于预设升级过、或早年那批快照——那时贡献方的 `ns:key` 解不开，文案被后来的回填
 * 脚本改过，逐字比对必然对不上，但那仍然是系统的内容而不是租户写的。
 */
function structure(value: unknown): string {
  const sections = Array.isArray(value) ? value : [];
  return JSON.stringify(
    sections.map((section) => {
      const row = (section ?? {}) as {
        type?: unknown;
        blocks?: unknown;
      };
      const blocks = Array.isArray(row.blocks) ? row.blocks : [];
      return [
        row.type,
        blocks.map((block) => (block as { type?: unknown })?.type),
      ];
    }),
  );
}

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (key === "id") continue;
      out[key] = strip((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
