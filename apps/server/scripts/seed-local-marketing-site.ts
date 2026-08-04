/**
 * 为 `local` 租户铺一套与**默认官网对齐**的自定义站点：首页 / 文档 / 定价。
 *
 * 内容直接取自默认官网的数据源（`HERO`、`FEATURES`、`BUILTIN_MODULES`、
 * `TECH_STACK`、`MARKETING_PLANS`、`PRICING_FAQ`、`content/docs/*.md`），
 * 所以改了那些常量，重跑本脚本即可让租户站点跟上，不用手抄一遍文案。
 *
 * 幂等：按 `kind + slug` 找已有页面，有则更新、无则创建，可反复执行。
 *
 *   pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { parseFrontmatter } from "../../../packages/modules/marketing/client/lib/frontmatter.js";
import {
  createPage,
  getOrCreateSite,
  setPageStatus,
  updatePage,
  updateSite,
} from "../../../packages/modules/marketing/server/site.service.js";
import {
  AGENT_WORKFLOW_STEPS,
  BUILTIN_MODULES,
  FEATURES,
  HERO,
  MARKETING_PLANS,
  PRICING_FAQ,
  SITE,
  SITE_FOOTER_GROUPS,
  TECH_STACK,
  type FeatureIconName,
} from "../../../packages/modules/marketing/shared/index.js";
import {
  createBlock,
  createSection,
  parseSettingValues,
  getSectionDefinition,
  type SectionType,
  type SettingValues,
  type SiteSection,
} from "../../../packages/modules/marketing/shared/section-schema.js";
import { PRICING_PLANS } from "../../../packages/modules/platform/shared/pricing-plans.js";

import type {
  MarketingPageKind,
  MarketingPageSettings,
} from "../../../packages/modules/marketing/shared/site-cms.js";

/** 默认官网的 `FeatureIconName` → section schema 的图标白名单。 */
const FEATURE_ICONS: Record<FeatureIconName, string> = {
  bot: "Bot",
  layers: "Layers",
  blocks: "Blocks",
  plug: "Plug",
  shield: "Shield",
  server: "Server",
};

const AGENT_STEP_COPY: Record<
  (typeof AGENT_WORKFLOW_STEPS)[number]["key"],
  { title: string; body: string }
> = {
  spec: {
    title: "填 Spec",
    body: "声明模块 id、权限、模型与 entitlement；留空则 Agent 必须追问，禁止瞎猜。",
  },
  gen: {
    title: "生成并装配",
    body: "骨架与六处注册表一次写对，避免漏挂路由或租户守卫。",
  },
  check: {
    title: "机器闸门",
    body: "契约与依赖校验拦住越权与漏装配，CI 跑同一套。",
  },
};

/** 造一个 section：默认值 + 覆盖值都过一遍 schema 校验。 */
function section(
  type: SectionType,
  settings: SettingValues,
  blocks: Array<{ type: string; settings: SettingValues }> = [],
): SiteSection {
  const base = createSection(type);
  return {
    ...base,
    settings: parseSettingValues(getSectionDefinition(type).settings, {
      ...base.settings,
      ...settings,
    }),
    blocks: blocks.map((block) =>
      createBlock(type, block.type, block.settings),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* 文档                                                                        */
/* -------------------------------------------------------------------------- */

interface DocEntry {
  slug: string;
  title: string;
  description: string;
  body: string;
  order: number;
}

function readDocPages(): DocEntry[] {
  const dir = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../packages/modules/marketing/content/docs",
  );
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const { data, body } = parseFrontmatter(
        readFileSync(join(dir, file), "utf8"),
      );
      const fallbackSlug = file.replace(/^\d+[-_]/u, "").replace(/\.md$/u, "");
      const prefix = /^(\d+)[-_]/u.exec(file);
      return {
        slug: data.slug ?? fallbackSlug,
        title: data.title ?? fallbackSlug,
        description: data.description ?? "",
        body,
        order: prefix ? Number(prefix[1]) : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => a.order - b.order);
}

/* -------------------------------------------------------------------------- */
/* 页面组装                                                                    */
/* -------------------------------------------------------------------------- */

function homeSections(docs: DocEntry[]): SiteSection[] {
  return [
    section(
      "hero",
      {
        eyebrow: SITE.tagline,
        headline: HERO.headline,
        subhead: HERO.subline,
        align: "left",
        show_glow: true,
        primary_label: HERO.primaryCta.label,
        primary_href: HERO.primaryCta.href,
        secondary_label: HERO.secondaryCta.label,
        secondary_href: HERO.secondaryCta.href,
      },
      [
        {
          type: "stat",
          settings: { term: "Agent 闭环", detail: "spec → gen → check" },
        },
        {
          type: "stat",
          settings: {
            term: "基础设施模块",
            detail: `${BUILTIN_MODULES.length} 个开箱可用`,
          },
        },
        {
          type: "stat",
          settings: { term: "租户隔离", detail: "Prisma 层 fail-closed" },
        },
      ],
    ),

    section(
      "steps",
      {
        heading: "为人与 Agent 共用的开发闭环",
        subheading:
          "不是又一份脚手架：结构化 Spec、一键装配、机器闸门，让 Cursor / Claude Code 在边界内扩模块。",
        primary_label: "读 Agent-first",
        primary_href: "/docs/agent-first",
        columns: 3,
        show_number: true,
      },
      AGENT_WORKFLOW_STEPS.map((step) => ({
        type: "step",
        settings: { ...AGENT_STEP_COPY[step.key], code: step.command },
      })),
    ),

    section(
      "feature-grid",
      {
        heading: "核心能力",
        subheading:
          "每个 SaaS 都要重写一遍的东西，底座已经写好了，而且都是可开关的模块而非硬编码。",
        columns: 3,
        show_icons: true,
      },
      FEATURES.map((feature) => ({
        type: "feature",
        settings: {
          icon: FEATURE_ICONS[feature.icon],
          title: feature.title,
          body: feature.description,
        },
      })),
    ),

    section(
      "cards",
      {
        heading: "基础设施开箱即用",
        subheading:
          "认证、租户、权限、审计、通知、任务、可观测性——按租户开关，未开通不产生数据。",
        columns: 4,
        card_style: "bordered",
      },
      BUILTIN_MODULES.map((item) => ({
        type: "card",
        settings: { title: item.name, body: item.description },
      })),
    ),

    section(
      "spec-list",
      {
        heading: "技术栈没有惊喜",
        subheading:
          "全是主流且长期维护的选择：招人好招，出问题搜得到答案，升级路径清晰。",
        primary_label: "读文档",
        primary_href: "/docs",
        layout: "split",
      },
      TECH_STACK.map((row) => ({
        type: "row",
        settings: { term: row.layer, detail: row.items },
      })),
    ),

    section(
      "cards",
      { heading: "从这里开始", columns: 2, card_style: "bordered" },
      docs.map((doc) => ({
        type: "card",
        settings: {
          title: doc.title,
          body: doc.description,
          href: `/docs/${doc.slug}`,
        },
      })),
    ),

    section("band", {
      headline: "先把底座跑起来，再让 Agent 扩业务",
      body: "本地 5 分钟起服务；模块用 Spec → gen → check 闭环落地。免费版可以一直用下去。",
      align: "center",
      background: "muted",
      primary_label: "免费开始",
      primary_href: "/register",
      secondary_label: "看定价",
      secondary_href: "/pricing",
    }),
  ];
}

function pricingSections(): SiteSection[] {
  return [
    section(
      "pricing",
      {
        // 同上：标题交给 page-head，这里只补一句定价口径
        subheading:
          "按席位计费，模块按租户开关。免费版可以一直用；升级只改配额，不用迁数据。",
        footnote:
          "价格为人民币含税月付价，年付享折扣。所有套餐都包含完整的基础设施模块与安全更新。",
        featured_badge: "推荐",
        columns: 3,
      },
      MARKETING_PLANS.map((entry) => {
        const plan = PRICING_PLANS[entry.slug];
        const paid = plan.price_monthly !== null && plan.price_monthly > 0;
        return {
          type: "plan",
          settings: {
            name: plan.name,
            audience: entry.audience,
            price:
              plan.price_monthly === null
                ? "按需报价"
                : plan.price_monthly === 0
                  ? "免费"
                  : `¥${plan.price_monthly}`,
            price_note: paid ? "/ 月" : "",
            highlights: entry.highlights.join("\n"),
            featured: entry.featured === true,
            primary_label: entry.cta.label,
            primary_href: entry.cta.href,
          },
        };
      }),
    ),

    section(
      "faq",
      { heading: "常见问题" },
      PRICING_FAQ.map((item) => ({
        type: "qa",
        settings: { question: item.question, answer: item.answer },
      })),
    ),
  ];
}

function docsIndexSections(_docs: DocEntry[]): SiteSection[] {
  return [
    // 动态子页面菜单：发布新文档页后目录自动出现，不用手填卡片
    section("page-menu", {
      source: "children",
      style: "cards",
      columns: 2,
    }),
  ];
}

/** 文档详情：1:3 group + 左 sticky siblings 菜单 + 右 narrow prose（对齐 page-presets）。 */
function docsDetailSections(body: string): SiteSection[] {
  const menu = section("page-menu", {
    source: "siblings",
    style: "list",
    columns: 1,
  });
  const prose = section("prose", {
    body_md: body,
    content_width: "narrow",
  });
  const base = createSection("group");
  return [
    {
      ...base,
      settings: parseSettingValues(getSectionDefinition("group").settings, {
        ...base.settings,
        columns_layout: "1:3",
      }),
      blocks: [
        {
          ...createBlock("group", "column", { sticky: true }),
          sections: [menu],
        },
        {
          ...createBlock("group", "column", {}),
          sections: [prose],
        },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */

async function upsertPage(
  tenant_id: string,
  input: {
    kind: MarketingPageKind;
    slug: string;
    title: string;
    description: string;
    sections: SiteSection[];
    settings?: MarketingPageSettings;
    sort_order: number;
  },
): Promise<void> {
  const existing = await prisma.marketingPage.findFirst({
    where: { tenant_id, slug: input.slug, kind: input.kind },
  });

  const pageId = existing
    ? (
        await updatePage(tenant_id, existing.id, {
          title: input.title,
          description: input.description,
          sections: input.sections,
          settings: input.settings,
          sort_order: input.sort_order,
        })
      ).id
    : (await createPage(tenant_id, input)).id;

  await setPageStatus(tenant_id, pageId, "published");
  console.warn(
    `  ${existing ? "updated" : "created"} ${input.kind}/${input.slug} — ${input.sections.length} sections`,
  );
}

async function main(): Promise<void> {
  const wanted = process.argv[2] ?? "local";
  const tenant =
    (await prisma.tenant.findFirst({ where: { slug: wanted } })) ??
    (await prisma.tenant.findFirst({ where: { slug: "vvenv" } }));
  if (!tenant) {
    throw new Error(`no tenant ${wanted} (and no vvenv fallback)`);
  }
  console.warn(`tenant ${tenant.slug} (${tenant.id})`);

  const docs = readDocPages();
  console.warn(`docs: ${docs.map((d) => d.slug).join(", ")}`);

  await getOrCreateSite(tenant.id);

  // 站点：品牌 + 页头 + 页脚，对齐默认官网
  await updateSite(tenant.id, {
    site_name: SITE.name,
    tagline: SITE.tagline,
    published: true,
    theme_settings: {
      primary_color: "#0369a1",
      font_family: "system",
      logo_url: null,
    },
    header: [
      section(
        "header",
        {
          show_logo: true,
          show_site_name: true,
          sticky: true,
          show_site_nav: true,
          secondary_label: "登录",
          secondary_href: "/login",
          primary_label: "免费开始",
          primary_href: "/register",
        },
        [],
      ),
    ],
    footer: [
      section(
        "footer",
        {
          show_logo: true,
          blurb: `${SITE.tagline}——${SITE.description}`,
          copyright: `© ${new Date().getFullYear()} ${SITE.name}`,
        },
        SITE_FOOTER_GROUPS.flatMap((group) =>
          group.links.map((link) => ({
            type: "footer_link",
            settings: {
              group: group.label,
              label: link.label,
              href: link.href,
            },
          })),
        ),
      ),
    ],
  });
  console.warn("site: brand + header + footer aligned");

  await upsertPage(tenant.id, {
    kind: "home",
    slug: "home",
    title: SITE.title,
    description: SITE.description,
    sections: homeSections(docs),
    sort_order: 0,
  });

  await upsertPage(tenant.id, {
    kind: "page",
    slug: "docs",
    title: "文档",
    description:
      "be-water 使用文档：快速开始、Agent-first、模块化架构、多租户与权限、部署。",
    sections: docsIndexSections(docs),
    sort_order: 10,
  });

  for (const [index, doc] of docs.entries()) {
    await upsertPage(tenant.id, {
      kind: "page",
      slug: `docs/${doc.slug}`,
      title: doc.title,
      description: doc.description,
      sections: docsDetailSections(doc.body),
      sort_order: 20 + index,
    });
  }

  await upsertPage(tenant.id, {
    kind: "page",
    slug: "pricing",
    title: "定价",
    description:
      "be-water 各套餐的价格、席位配额与功能范围：免费版起步，企业版支持私有化部署与定制模块。",
    sections: pricingSections(),
    sort_order: 100,
  });

  console.warn(`\ndone — visit the tenant host for ${tenant.slug}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
