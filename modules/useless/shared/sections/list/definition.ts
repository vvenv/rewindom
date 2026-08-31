/**
 * 无用之物列表段 —— 首页版式的目录。
 *
 * 条目来自已启用的东西。列表上每一件是一张缩略图（有截图用截图，没有就用
 * 可交互物自己缩小后的样子），点进去才是详情。名字不画——公开站不把玩笑先说破。
 */

import {
  THING_ENTITLEMENT,
  USELESS_SECTION_GROUP,
} from "../../entitlements.js";

import { HOME_PAGE_KIND } from "@rewindom/builtin/marketing/shared/page-templates.js";
import {
  columnsSetting,
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const USELESS_LIST_SECTION_TYPE = "useless.list";

export const uselessListSection: SectionDefinition = {
  type: USELESS_LIST_SECTION_TYPE,
  label: "useless:section.list.label",
  group: USELESS_SECTION_GROUP,
  placements: ["page"],
  page_kinds: [HOME_PAGE_KIND],
  entitlement: THING_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "useless:section.list.group" },
    {
      type: "text",
      id: "empty_text",
      label: "useless:section.list.emptyText",
      info: "useless:section.list.emptyTextInfo",
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    columnsSetting(4, 3),
    ...layoutSettings({ padding_top: 48, padding_bottom: 64 }),
  ],
};
