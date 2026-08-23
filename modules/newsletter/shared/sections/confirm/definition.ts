import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import {
  NEWSLETTER_ENTITLEMENT,
  NEWSLETTER_SECTION_GROUP,
} from "../../entitlements.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const NEWSLETTER_CONFIRM_PAGE_KIND = "newsletter_confirm";
export const NEWSLETTER_CONFIRM_SECTION_TYPE = "newsletter.confirm-panel";

/**
 * 确认订阅面板 —— 确认页的**必备段**，编辑器不给删。
 *
 * 它是这张模板存在的理由本身：删掉它，读者手里那些确认链接就全部点不动了。
 *
 * `page_kinds` 把它钉在确认页上——这段摆到别的页面上没有任何意义（没有 token）。
 */
export const newsletterConfirmSection: SectionDefinition = {
  type: NEWSLETTER_CONFIRM_SECTION_TYPE,
  label: "newsletter:section.confirm.label",
  group: NEWSLETTER_SECTION_GROUP,
  placements: ["page"],
  page_kinds: [NEWSLETTER_CONFIRM_PAGE_KIND],
  entitlement: NEWSLETTER_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "newsletter:section.confirm.group" },
    {
      type: "text",
      id: "submit_label",
      label: "newsletter:section.confirm.submitLabel",
      default: "newsletter:confirm.submit",
      required: true,
    },
    {
      type: "textarea",
      id: "success_message",
      label: "newsletter:section.confirm.successMessage",
      rows: 2,
      default: "newsletter:confirm.success",
    },
    {
      type: "textarea",
      id: "invalid_message",
      label: "newsletter:section.confirm.invalidMessage",
      rows: 2,
      default: "newsletter:confirm.invalid",
    },
    ...layoutSettings({ padding_top: 64, padding_bottom: 64 }),
  ],
};
