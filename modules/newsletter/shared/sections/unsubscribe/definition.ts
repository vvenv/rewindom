import {
  headingSettings,
  layoutSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import {
  NEWSLETTER_ENTITLEMENT,
  NEWSLETTER_SECTION_GROUP,
} from "../../entitlements.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

export const NEWSLETTER_UNSUBSCRIBE_PAGE_KIND = "newsletter_unsubscribe";
export const NEWSLETTER_UNSUBSCRIBE_SECTION_TYPE =
  "newsletter.unsubscribe-panel";

/**
 * 取消订阅面板 —— 退订页的**必备段**。
 *
 * 这是读者对这个站的最后一次印象，也是「不想再收到」与「举报垃圾邮件」之间唯一的
 * 那道岔口。段被删掉的后果是退订按钮失效，读者只剩举报一条路。
 */
export const newsletterUnsubscribeSection: SectionDefinition = {
  type: NEWSLETTER_UNSUBSCRIBE_SECTION_TYPE,
  label: "newsletter:section.unsubscribe.label",
  group: NEWSLETTER_SECTION_GROUP,
  placements: ["page"],
  page_kinds: [NEWSLETTER_UNSUBSCRIBE_PAGE_KIND],
  entitlement: NEWSLETTER_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "newsletter:section.unsubscribe.group" },
    {
      type: "text",
      id: "submit_label",
      label: "newsletter:section.unsubscribe.submitLabel",
      default: "newsletter:unsubscribe.submitAll",
      required: true,
    },
    {
      type: "textarea",
      id: "success_message",
      label: "newsletter:section.unsubscribe.successMessage",
      rows: 2,
      default: "newsletter:unsubscribe.success",
    },
    {
      type: "textarea",
      id: "invalid_message",
      label: "newsletter:section.unsubscribe.invalidMessage",
      rows: 2,
      default: "newsletter:unsubscribe.invalid",
    },
    ...layoutSettings({ padding_top: 64, padding_bottom: 64 }),
  ],
};
