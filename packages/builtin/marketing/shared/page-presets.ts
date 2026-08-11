import {
  DOC_TEMPLATE_SLUGS,
  registerPageTemplatePreset,
  type DocTemplateKind,
} from "./page-templates.js";
import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "./section-schema.js";

import type {
  PagePreset,
  PresetBlock,
  PresetSection,
  PresetTranslateFn,
} from "./page-presets.types.js";

export type {
  PagePreset,
  PresetBlock,
  PresetSection,
  PresetTranslateFn,
} from "./page-presets.types.js";

/**
 * 默认起步模板的首页版式（仅 `buildSiteStarter` 用，不进可选预设菜单）。
 */
export const HOME_STARTER_PRESET: PagePreset = {
  /*
   * 起步首页刻意只有三段。
   *
   * 它是**起点**，不是成品：租户第一件事是把文案换成自己的，段数越多越像
   * 「改别人的站」，改不完就干脆整页删掉重来。原来这页有六段十八块，还写死了
   * 本仓自己的技术栈（Fastify / Prisma / `pnpm gen:module`），对任何真实租户
   * 都是噪音。
   */
  key: "home",
  label: "preset.home.label",
  kind: "home",
  slug: "home",
  titleKey: "preset.home.title",
  descriptionKey: "preset.home.description",
  sections: [
    {
      type: "hero",
      text: {
        headline: "preset.home.hero.headline",
        subhead: "preset.home.hero.subhead",
        primary_label: "preset.home.hero.primary_label",
      },
      raw: {
        // 起步模板只建首页，站内没有别的地址可指；页内锚点是单页站的通行写法
        primary_href: "#contact",
        align: "left",
        show_glow: true,
      },
    },
    {
      type: "prose",
      text: {
        body_md: "preset.home.prose.body_md",
      },
      raw: { padding_top: 48, padding_bottom: 48 },
    },
    {
      type: "band",
      text: {
        headline: "preset.home.cta.headline",
        body: "preset.home.cta.body",
        primary_label: "preset.home.cta.primary_label",
      },
      raw: {
        anchor: "contact",
        primary_href: "mailto:hello@example.com",
        align: "center",
        background: "muted",
        spacing_above: 32,
        padding_top: 48,
        padding_bottom: 48,
      },
    },
  ],
};

/**
 * 文档库两张模板页的**默认版式**。
 *
 * 它们是**兜底**：租户没自定义过版式时，`/docs` 与 `/docs/:slug` 直接按这里渲染
 * （见 `server/marketing-doc.ssr.ts`）。所以不进新建页面的可选菜单。
 *
 * 也正因为是兜底，这两份版式不落库：不给没用文档的租户塞两张空页，也就不需要
 * 为存量租户写数据迁移。租户想改，在编辑器里保存一次即成为一条真实页面记录。
 */
export const DOC_TEMPLATE_PRESETS: Record<DocTemplateKind, PagePreset> = {
  doc_index: {
    key: "doc_index",
    label: "preset.doc_index.label",
    kind: "doc_index",
    slug: DOC_TEMPLATE_SLUGS.doc_index,
    titleKey: "preset.doc_index.title",
    descriptionKey: "preset.doc_index.description",
    sections: [
      {
        type: "page-header",
        text: {
          headline: "preset.doc_index.headline",
          subhead: "preset.doc_index.subhead",
        },
      },
      {
        type: "doc-list",
        raw: {
          group_by: "category",
          style: "cards",
          columns: 2,
          show_description: true,
        },
      },
    ],
  },
  doc_article: {
    key: "doc_article",
    label: "preset.doc_article.label",
    kind: "doc_article",
    slug: DOC_TEMPLATE_SLUGS.doc_article,
    titleKey: "preset.doc_article.title",
    descriptionKey: "preset.doc_article.description",
    sections: [
      {
        /*
         * 三栏：左目录 + 正文 + 右章节导航——文档站的通行版式。
         *
         * 两个导航都是**独立的段**，不想要就在编辑器里删掉，不需要另开开关；
         * 窄屏由 group 自己堆叠成上下（见 base.css 的 `.grp`），吸顶也自动失效。
         */
        type: "group",
        raw: {
          columns_layout: "3:7:2",
          column_gap: 40,
          align_items: "stretch",
        },
        blocks: [
          {
            type: "column",
            raw: { show_divider: true },
            sections: [
              { type: "doc-nav", raw: { sticky: true, show_category: true } },
            ],
          },
          {
            type: "column",
            raw: { show_divider: true },
            sections: [{ type: "doc-article" }],
          },
          {
            type: "column",
            sections: [{ type: "doc-toc", raw: { sticky: true } }],
          },
        ],
      },
    ],
  },
};

/** 兜底版式落成真实 sections（同 `buildPresetSections`，只是入口按 kind 取）。 */
export function buildDocTemplateSections(
  kind: DocTemplateKind,
  t: PresetTranslateFn,
): SiteSection[] {
  return buildPresetSections(DOC_TEMPLATE_PRESETS[kind], t);
}

/*
 * 把兜底版式登记进模板页注册表，中台的「自定义版式」按钮按 kind 取它建页。
 * 元数据（slug / path）在 `page-templates.ts` 里就登记好了，与预设分开的理由见那边。
 */
registerPageTemplatePreset("home", HOME_STARTER_PRESET);
registerPageTemplatePreset("doc_index", DOC_TEMPLATE_PRESETS.doc_index);
registerPageTemplatePreset("doc_article", DOC_TEMPLATE_PRESETS.doc_article);

/** 首页兜底版式落成真实 sections（同 `buildPresetSections`，只是入口固定为 home）。 */
export function buildHomeTemplateSections(
  t: PresetTranslateFn,
): SiteSection[] {
  return buildPresetSections(HOME_STARTER_PRESET, t);
}

function resolveValues(
  t: PresetTranslateFn,
  text: Record<string, string> | undefined,
  raw: SettingValues | undefined,
): SettingValues {
  const out: SettingValues = { ...(raw ?? {}) };
  for (const [id, key] of Object.entries(text ?? {})) {
    out[id] = t(key);
  }
  return out;
}

/** 把预设里的一个 block 落成真实 block（容器列里的子段一并展开）。 */
export function buildPresetBlock(
  sectionType: string,
  spec: PresetBlock,
  t: PresetTranslateFn,
): SiteBlock {
  const created = createBlock(
    sectionType,
    spec.type,
    resolveValues(t, spec.text, spec.raw),
  );
  // 容器 block（列）里的子段同样走一遍预设展开
  return spec.sections
    ? {
        ...created,
        sections: spec.sections.map((child) => buildPresetSection(child, t)),
      }
    : created;
}

/** 把预设里的一段落成真实 section（`preset-merge` 按段补缺时也用它）。 */
export function buildPresetSection(
  spec: PresetSection,
  t: PresetTranslateFn,
): SiteSection {
  const base = createSection(spec.type);
  const blocks = spec.blocks
    ? spec.blocks.map((block) => buildPresetBlock(spec.type, block, t))
    : base.blocks;
  // `createSection` 已经对认不出来的 type 抛过了，这里的定义必然存在
  const definition = getSectionDefinition(spec.type)!;
  return {
    ...base,
    settings: parseSettingValues(definition.settings, {
      ...base.settings,
      ...resolveValues(t, spec.text, spec.raw),
    }),
    blocks,
  };
}

/** 把预设落成真实 sections（文案已翻译，id 已生成，值过一遍 schema 校验）。 */
export function buildPresetSections(
  preset: PagePreset,
  t: PresetTranslateFn,
): SiteSection[] {
  return preset.sections.map((spec) => buildPresetSection(spec, t));
}

/** 起步模板引用的页面版式（目前只有首页）。 */
export function findStarterPagePreset(key: string): PagePreset | undefined {
  if (key === HOME_STARTER_PRESET.key) return HOME_STARTER_PRESET;
  return undefined;
}
