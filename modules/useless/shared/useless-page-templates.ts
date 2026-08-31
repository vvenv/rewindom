/**
 * 公开无用之物页的**首页版式**与**详情模板页**。
 *
 * 首页只有一张（`kind: home`，路径 `/`）：贡献一套版式，租户套用后站点根就是目录。
 * 详情是一张模板页（`/:slug`），必备段编辑器不给删。
 *
 * `/:slug` 走 path fallback：已发布的 CMS 页先赢，对不上再认 thing。
 *
 * 元数据在**两端**都要登记，所以由 `registerUselessPageTemplates()` 统一暴露，
 * server `onBoot` 与 client manifest 各调一次；重复登记是幂等的。
 */

import { THING_ENTITLEMENT } from "./entitlements.js";
import { USELESS_LIST_SECTION_TYPE } from "./sections/list/definition.js";
import {
  USELESS_THING_PAGE_KIND,
  USELESS_THING_SECTION_TYPE,
} from "./sections/thing/definition.js";
import { USELESS_THING_PATH } from "./useless-section-context.js";

import {
  registerInterpolationTokens,
  type InterpolationTokenDefinition,
} from "@rewindom/builtin/marketing/shared/interpolation-tokens.js";
import {
  registerHomeLayout,
  type HomeLayoutDefinition,
} from "@rewindom/builtin/marketing/shared/home-layouts.js";
import {
  HOME_PAGE_KIND,
  registerPageTemplateKind,
  registerPageTemplatePreset,
  type PageTemplateKindDefinition,
} from "@rewindom/builtin/marketing/shared/page-templates.js";

import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";

export const USELESS_PAGE_TEMPLATE_GROUP = "useless:template.group";

export const USELESS_HOME_LAYOUT_KEY = "useless.home";
export const USELESS_THING_TEMPLATE_SLUG = "thing";

export { USELESS_THING_PAGE_KIND, HOME_PAGE_KIND };

export const USELESS_HOME_LAYOUT_PRESET: PagePreset = {
  key: USELESS_HOME_LAYOUT_KEY,
  label: "useless:home.layout.label",
  kind: HOME_PAGE_KIND,
  slug: "home",
  titleKey: "useless:site.index.title",
  descriptionKey: "useless:site.index.subtitle",
  sections: [
    {
      type: USELESS_LIST_SECTION_TYPE,
      text: {
        heading: "useless:site.index.title",
        empty_text: "useless:section.list.emptyDefault",
      },
    },
  ],
};

const USELESS_HOME_LAYOUT: HomeLayoutDefinition = {
  key: USELESS_HOME_LAYOUT_KEY,
  label: "useless:home.layout.label",
  description: "useless:home.layout.description",
  group: USELESS_PAGE_TEMPLATE_GROUP,
  entitlement: THING_ENTITLEMENT.key,
  preset: USELESS_HOME_LAYOUT_PRESET,
};

export const USELESS_THING_TEMPLATE_PRESET: PagePreset = {
  key: USELESS_THING_PAGE_KIND,
  label: "useless:template.thing.label",
  kind: USELESS_THING_PAGE_KIND,
  slug: USELESS_THING_TEMPLATE_SLUG,
  titleKey: "useless:site.thing.title",
  descriptionKey: "useless:site.thing.subtitle",
  sections: [
    {
      type: USELESS_THING_SECTION_TYPE,
      text: { empty_text: "useless:section.thing.emptyDefault" },
    },
  ],
};

const USELESS_TEMPLATE_KINDS: readonly PageTemplateKindDefinition[] = [
  {
    kind: USELESS_THING_PAGE_KIND,
    slug: USELESS_THING_TEMPLATE_SLUG,
    path: USELESS_THING_PATH,
    group: USELESS_PAGE_TEMPLATE_GROUP,
    label: "useless:template.thing.label",
    required_section: USELESS_THING_SECTION_TYPE,
    entitlement: THING_ENTITLEMENT.key,
  },
];

const USELESS_INTERPOLATION_TOKENS: readonly InterpolationTokenDefinition[] = [
  {
    key: "thing",
    label: "useless:token.thing",
    page_kinds: [USELESS_THING_PAGE_KIND],
    entitlement: THING_ENTITLEMENT.key,
  },
];

/** 登记无用之物首页版式与详情模板页（幂等）；server `onBoot` 与 client manifest 各调一次。 */
export function registerUselessPageTemplates(): void {
  registerHomeLayout(USELESS_HOME_LAYOUT);
  for (const definition of USELESS_TEMPLATE_KINDS) {
    registerPageTemplateKind(definition);
  }
  registerInterpolationTokens(USELESS_INTERPOLATION_TOKENS);
  registerPageTemplatePreset(USELESS_THING_PAGE_KIND, USELESS_THING_TEMPLATE_PRESET);
}
