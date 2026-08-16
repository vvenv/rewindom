/**
 * 优惠码公告条 —— 通栏一行，推当前力度最大的那个整单码。
 *
 * 「页头之上」不是一个新区域：页头区本来就是一串 section，导航条只是其中的本体段。
 * 把这一段拖到导航条**之前**，它就渲染在页头上方；拖进页面流或页脚也照样能用
 *（`placements`），所以不为「公告条」另造一种区域或类型。
 *
 * 没有生效中的码时**整段不渲染**——挂着一个空条比不挂更糟。
 */

import { SHOP_ENTITLEMENT } from "./entitlements.js";

import {
  ALIGN_OPTIONS,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const SHOP_PROMO_SECTION_TYPE = "shop.promo";

export const promoSection: SectionDefinition = {
  type: SHOP_PROMO_SECTION_TYPE,
  label: "shop:section.promo.label",
  placements: ["header", "page", "footer"],
  entitlement: SHOP_ENTITLEMENT.key,
  settings: [
    { type: "header", content: "editor.group.content" },
    {
      type: "text",
      id: "text",
      label: "shop:section.promo.text",
      default: "shop:storefront.promo.text",
      required: true,
      info: "shop:section.promo.textInfo",
    },
    {
      // 站内地址从下拉选、外链手填——与导航链接同一个控件
      type: "link",
      id: "href",
      label: "shop:section.promo.href",
      placeholder: "/shop",
      default: "/shop",
      info: "shop:section.promo.hrefInfo",
    },
    {
      type: "select",
      id: "align",
      label: "editor.setting.align",
      default: "center",
      options: ALIGN_OPTIONS,
    },
    { type: "header", content: "editor.group.layout", group: "layout" },
    ...layoutSettings({ padding_top: 8, padding_bottom: 8 }),
  ],
};
