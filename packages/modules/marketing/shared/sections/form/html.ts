import { escapeHtml } from "../../html.js";
import { settingText } from "../../section-schema.js";
import { blockSurfaceAttr, sectionHeading } from "../_common/html.js";

import { resolveFormFields, type FormField } from "./fields.js";

import type { SectionHtmlRenderer } from "../render-context.js";

/** DOM id 前缀：block id 是 uuid，直接当 id 会和页内锚点抢命名空间。 */
export function formFieldDomId(fieldId: string): string {
  return `f-${fieldId}`;
}

function controlHtml(field: FormField): string {
  const id = escapeHtml(formFieldDomId(field.id));
  const name = escapeHtml(field.id);
  const required = field.required ? " required" : "";
  const placeholder = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : "";

  if (field.type === "textarea") {
    return `<textarea id="${id}" name="${name}" rows="4"${placeholder}${required}></textarea>`;
  }
  if (field.type === "select") {
    const options = field.options
      .map(
        (option) =>
          `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`,
      )
      .join("");
    return `<select id="${id}" name="${name}"${required}><option value=""></option>${options}</select>`;
  }
  if (field.type === "checkbox") {
    return `<input id="${id}" name="${name}" type="checkbox"${required} />`;
  }
  return `<input id="${id}" name="${name}" type="${field.type}"${placeholder}${required} />`;
}

function fieldHtml(field: FormField, surface: string): string {
  const id = escapeHtml(formFieldDomId(field.id));
  const label = `${escapeHtml(field.label)}${field.required ? `<span class="form-req" aria-hidden="true">*</span>` : ""}`;
  const classes = `form-field${field.wide ? " form-field-wide" : ""}${field.type === "checkbox" ? " form-check" : ""}`;

  // 勾选框把控件放进 label 里：点文字也能勾上，且不需要额外的对齐规则
  if (field.type === "checkbox") {
    return `<div class="${classes}"${surface}><label for="${id}">${controlHtml(field)}<span>${label}</span></label></div>`;
  }
  return `<div class="${classes}"${surface}><label for="${id}">${label}</label>${controlHtml(field)}</div>`;
}

/**
 * 表单段的 SSR。
 *
 * **只出静态结构，不带提交脚本**——与本模块既有口径一致（见 MODULE.md：SSR 是 SEO
 * 真相源，交互层由 SPA 接管）。但光不带脚本还不够：原生 `<form>` 在水合前被提交会
 * 直接导航走，页面白一下什么也没发生。`onsubmit="return false"` 是**不引入 script
 * 标签**就能挡住这一下的唯一办法，所以它在这里，不是随手写的。
 */
export const renderFormHtml: SectionHtmlRenderer = (section) => {
  const fields = resolveFormFields(section);
  if (fields.length === 0) return "";
  const s = section.settings;
  const rows = section.blocks
    .filter((block) => block.type === "field")
    .map((block, index) =>
      fieldHtml(fields[index]!, blockSurfaceAttr(block.settings)),
    )
    .join("");

  return `${sectionHeading(s)}<form class="site-form" data-section-id="${escapeHtml(section.id)}" onsubmit="return false"><div class="form-grid">${rows}</div><div class="form-actions"><button class="btn" type="submit">${escapeHtml(settingText(s, "submit_label"))}</button></div></form>`;
};
