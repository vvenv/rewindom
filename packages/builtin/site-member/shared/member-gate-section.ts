/**
 * 「会员专属内容」段的定义 —— **一份**，两端 import 同一个。
 *
 * 放在 `shared/` 而不是各自复制一份，是这个契约成立的前提：schema 只有一处，
 * SSR 渲染与编辑器视图各自注册时都拿这个对象，不会出现两边字段对不上。
 *
 * type 带模块前缀（`site-member.`）：段 type 会落进租户页面的存储里，两个模块撞名的
 * 后果是页面内容被另一个模块的 schema 解析。marketing 的注册表对撞名直接抛错。
 */


import type { SectionDefinition } from "../../marketing/shared/section-schema.js";

export const MEMBER_GATE_SECTION_TYPE = "site-member.gate";

export const memberGateSection: SectionDefinition = {
  type: MEMBER_GATE_SECTION_TYPE,
  // 带命名空间的 key：文案在本模块的 i18n 包里，marketing 的编辑器认前缀
  label: "site-member:section.gate.label",
  placements: ["page"],
  settings: [
    {
      type: "richtext",
      id: "body_md",
      label: "site-member:section.gate.body",
      rows: 12,
      info: "site-member:section.gate.bodyInfo",
    },
    {
      type: "header",
      content: "site-member:section.gate.locked",
    },
    {
      type: "text",
      id: "locked_headline",
      label: "site-member:section.gate.lockedHeadline",
      default: "site-member:gate.title",
      required: true,
    },
    {
      type: "textarea",
      id: "locked_body",
      label: "site-member:section.gate.lockedBody",
      rows: 2,
    },
    {
      type: "text",
      id: "login_label",
      label: "site-member:section.gate.loginLabel",
      default: "site-member:gate.login",
      required: true,
    },
  ],
};
