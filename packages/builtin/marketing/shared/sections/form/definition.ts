import {
  headingSettings,
  layoutSettings,
  styleSettings,
} from "../_common/settings.js";

import { FORM_FIELD_TYPES, FORM_VALIDATION_RULES } from "./fields.js";

import type { SectionDefinition } from "../types.js";

/**
 * 表单段：第一个**会往回写数据**的段。
 *
 * 其余段都是「把 settings 画出来」，这一段还要收访客填的东西——所以它多带三样：
 * 字段表（`field` block）、提交成功后说什么、以及一个服务端校验入口
 *（`fields.ts` 的 `validateFormValues`，两端渲染与提交接口共用同一份）。
 *
 * 刻意**不**做「提交后发到哪」的配置：先把「收得到、看得见」做对，通知渠道
 *（邮件 / webhook）是另一件事，不该塞进段的 schema 里。
 */
export const formSection: SectionDefinition = {
  type: "form",
  label: "editor.sectionType.form",
  placements: ["page"],
  settings: [
    ...headingSettings(),
    { type: "header", content: "editor.group.form" },
    {
      type: "text",
      id: "submit_label",
      label: "editor.setting.submit_label",
      default: "marketing:storefront.form.submit",
      required: true,
    },
    {
      type: "textarea",
      id: "success_message",
      label: "editor.setting.success_message",
      rows: 2,
      info: "editor.info.success_message",
    },
    ...layoutSettings(),
  ],
  max_blocks: 16,
  preset_blocks: [
    {
      type: "field",
      settings: { label: "marketing:storefront.form.fieldName", type: "text" },
    },
    {
      type: "field",
      settings: {
        label: "marketing:storefront.form.fieldEmail",
        type: "email",
      },
    },
    {
      type: "field",
      settings: {
        label: "marketing:storefront.form.fieldMessage",
        type: "textarea",
      },
    },
  ],
  blocks: [
    {
      type: "field",
      label: "editor.blockType.field",
      settings: [
        {
          type: "text",
          id: "label",
          label: "editor.setting.field_label",
          default: "marketing:storefront.form.field",
          required: true,
        },
        {
          type: "select",
          id: "type",
          label: "editor.setting.field_type",
          default: "text",
          // 直接复用类型表：加一种控件时改不到这里
          options: FORM_FIELD_TYPES.map((value) => ({
            value,
            label: `editor.option.field_type.${value}`,
          })),
        },
        {
          type: "text",
          id: "placeholder",
          label: "editor.setting.placeholder",
        },
        {
          type: "checkbox",
          id: "required",
          label: "editor.setting.field_required",
          default: false,
        },
        {
          type: "list",
          id: "options",
          label: "editor.setting.field_options",
          rows: 4,
          info: "editor.info.field_options",
        },
        {
          type: "checkbox",
          id: "wide",
          label: "editor.setting.field_wide",
          default: false,
          info: "editor.info.field_wide",
        },
        { type: "header", content: "editor.group.validation" },
        {
          type: "select",
          id: "validation",
          label: "editor.setting.field_validation",
          default: "none",
          options: FORM_VALIDATION_RULES.map((value) => ({
            value,
            label: `editor.option.validation.${value}`,
          })),
        },
        {
          type: "text",
          id: "pattern",
          label: "editor.setting.field_pattern",
          localizable: false,
          placeholder: "^\\d{4}-\\d{4}$",
          info: "editor.info.field_pattern",
        },
        {
          type: "range",
          id: "min_length",
          label: "editor.setting.field_min_length",
          default: 0,
          min: 0,
          max: 200,
          step: 1,
          info: "editor.info.field_min_length",
        },
        {
          type: "range",
          id: "max_length",
          label: "editor.setting.field_max_length",
          default: 0,
          min: 0,
          max: 200,
          step: 1,
          info: "editor.info.field_max_length",
        },
        ...styleSettings(),
      ],
    },
  ],
};
