import {
  headingSettings,
  layoutSettings,
  styleSettings,
} from "@rewindom/builtin/marketing/shared/sections/_common/settings.js";

import { SITE_FORM_ENTITLEMENT } from "../../entitlements.js";

import { FORM_FIELD_TYPES, FORM_VALIDATION_RULES } from "./fields.js";

import type { SectionDefinition } from "@rewindom/builtin/marketing/shared/section-schema.js";

/**
 * 段 type 带模块前缀（与 `shop.*`、`site-docs.*` 同口径）。
 *
 * 存量正文里存的是拆分前的裸 `form`，由 marketing 解析层的 `SECTION_TYPE_ALIASES`
 * 改写一次——不扫 jsonb，也不双读。
 */
export const SITE_FORM_SECTION_TYPE = "site-form.form";

/**
 * 表单段：官网上唯一**会往回写数据**的段。
 *
 * 其余段都是「把 settings 画出来」，这一段还要收访客填的东西——所以它多带三样：
 * 字段表（`field` block）、提交成功后说什么、以及一个服务端校验入口
 *（`fields.ts` 的 `validateFormValues`，渲染与提交接口共用同一份）。
 *
 * 刻意**不**做「提交后发到哪」的配置：先把「收得到、看得见」做对，通知渠道
 *（邮件 / webhook）是另一件事，不该塞进段的 schema 里。
 */
export const formSection: SectionDefinition = {
  type: SITE_FORM_SECTION_TYPE,
  label: "site-form:section.form.label",
  placements: ["page"],
  entitlement: SITE_FORM_ENTITLEMENT.key,
  settings: [
    ...headingSettings(),
    { type: "header", content: "site-form:section.form.group" },
    {
      type: "text",
      id: "submit_label",
      label: "site-form:section.form.submitLabel",
      default: "site-form:form.submit",
      required: true,
    },
    {
      type: "textarea",
      id: "success_message",
      label: "site-form:section.form.successMessage",
      rows: 2,
      info: "site-form:section.form.successMessageInfo",
    },
    ...layoutSettings(),
  ],
  max_blocks: 16,
  preset_blocks: [
    {
      type: "field",
      settings: { label: "site-form:form.fieldName", type: "text" },
    },
    {
      type: "field",
      settings: {
        label: "site-form:form.fieldEmail",
        type: "email",
      },
    },
    {
      type: "field",
      settings: {
        label: "site-form:form.fieldMessage",
        type: "textarea",
      },
    },
  ],
  blocks: [
    {
      type: "field",
      label: "site-form:section.form.blockField",
      settings: [
        {
          type: "text",
          id: "label",
          label: "site-form:section.form.fieldLabel",
          default: "site-form:form.field",
          required: true,
        },
        {
          type: "select",
          id: "type",
          label: "site-form:section.form.fieldType",
          default: "text",
          // 直接复用类型表：加一种控件时改不到这里
          options: FORM_FIELD_TYPES.map((value) => ({
            value,
            label: `site-form:section.form.fieldTypeOption.${value}`,
          })),
        },
        {
          type: "text",
          id: "placeholder",
          label: "site-form:section.form.placeholder",
        },
        {
          type: "checkbox",
          id: "required",
          label: "site-form:section.form.fieldRequired",
          default: false,
        },
        {
          type: "list",
          id: "options",
          label: "site-form:section.form.fieldOptions",
          rows: 4,
          info: "site-form:section.form.fieldOptionsInfo",
        },
        {
          type: "checkbox",
          id: "wide",
          label: "site-form:section.form.fieldWide",
          default: false,
          info: "site-form:section.form.fieldWideInfo",
        },
        { type: "header", content: "site-form:section.form.groupValidation" },
        {
          type: "select",
          id: "validation",
          label: "site-form:section.form.fieldValidation",
          default: "none",
          options: FORM_VALIDATION_RULES.map((value) => ({
            value,
            label: `site-form:section.form.validationOption.${value}`,
          })),
        },
        {
          type: "text",
          id: "pattern",
          label: "site-form:section.form.fieldPattern",
          localizable: false,
          placeholder: "^\\d{4}-\\d{4}$",
          info: "site-form:section.form.fieldPatternInfo",
        },
        {
          type: "range",
          id: "min_length",
          label: "site-form:section.form.fieldMinLength",
          default: 0,
          min: 0,
          max: 200,
          step: 1,
          info: "site-form:section.form.fieldMinLengthInfo",
        },
        {
          type: "range",
          id: "max_length",
          label: "site-form:section.form.fieldMaxLength",
          default: 0,
          min: 0,
          max: 200,
          step: 1,
          info: "site-form:section.form.fieldMaxLengthInfo",
        },
        ...styleSettings(),
      ],
    },
  ],
};
