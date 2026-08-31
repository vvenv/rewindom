/**
 * 无用之物详情段 —— `/:slug` 模板页的必备段。
 *
 * 当前这一件铺满视口（与曾经「那天那个」同一块舞台）。名字不画。
 */

import {
  THING_ENTITLEMENT,
  USELESS_SECTION_GROUP,
} from "../../entitlements.js";

import { layoutSettings } from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const USELESS_THING_SECTION_TYPE = "useless.thing";
export const USELESS_THING_PAGE_KIND = "useless_thing";

export const uselessThingSection: SectionDefinition = {
  type: USELESS_THING_SECTION_TYPE,
  label: "useless:section.thing.label",
  group: USELESS_SECTION_GROUP,
  placements: ["page"],
  page_kinds: [USELESS_THING_PAGE_KIND],
  entitlement: THING_ENTITLEMENT.key,
  settings: [
    { type: "header", content: "useless:section.thing.group" },
    {
      type: "text",
      id: "empty_text",
      label: "useless:section.thing.emptyText",
      info: "useless:section.thing.emptyTextInfo",
    },
    ...layoutSettings({
      padding_top: 0,
      padding_bottom: 0,
      anchor: "thing",
    }),
  ],
};
