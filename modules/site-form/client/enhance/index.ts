/**
 * 公开站表单提交（无 React）。
 *
 * 由 marketing 的 site-enhance 在构建期扫进同一个 IIFE（导出名 `enhanceSite` 是约定），
 * 运行时拿到的 `context` 是当前页面的语言与路径快照——本模块不自己去认 marketing 的
 * DOM 约定。校验用 shared 的 `validateFormValues`（与服务端同一份），提交走
 * `POST /api/public/site-form/submit`。
 */

import {
  validateFormValues,
  type FormField,
  type FormFieldType,
  type FormValidationRule,
  type FormValues,
} from "../../shared/sections/form/fields.js";
import { formErrorText } from "../../shared/sections/form/messages.js";

import type { SiteEnhanceContext } from "@rewindom/builtin/marketing/client/enhance/main.js";
import type { AppLocale } from "@rewindom/module-sdk";

function fieldsFromForm(form: HTMLFormElement): FormField[] {
  const fields: FormField[] = [];
  for (const el of Array.from(
    form.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >("input[name], textarea[name], select[name]"),
  )) {
    const id = el.name;
    if (!id || fields.some((field) => field.id === id)) continue;
    const type = (
      el instanceof HTMLSelectElement
        ? "select"
        : el instanceof HTMLTextAreaElement
          ? "textarea"
          : el.type === "checkbox"
            ? "checkbox"
            : el.type === "email"
              ? "email"
              : el.type === "tel"
                ? "tel"
                : "text"
    ) as FormFieldType;
    const options =
      el instanceof HTMLSelectElement
        ? Array.from(el.options)
            .map((option) => option.value)
            .filter((value) => value !== "")
        : [];
    const labelEl = form.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    const label =
      labelEl?.textContent?.replace(/\*$/u, "").trim() ||
      el.getAttribute("aria-label") ||
      id;
    const validationAttr = el.getAttribute("data-validation") || "none";
    fields.push({
      id,
      label,
      type,
      placeholder: el.getAttribute("placeholder") || "",
      required: el.required,
      options,
      wide: Boolean(el.closest(".form-field-wide")),
      validation: validationAttr as FormValidationRule,
      pattern: el.getAttribute("data-pattern") || "",
      minLength: Number(el.getAttribute("data-min-length")) || 0,
      maxLength: Number(el.getAttribute("data-max-length")) || 0,
    });
  }
  return fields;
}

function valuesFromForm(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  const data = new FormData(form);
  data.forEach((value, key) => {
    if (typeof value !== "string") return;
    const control = form.elements.namedItem(key);
    if (control instanceof HTMLInputElement && control.type === "checkbox") {
      values[key] = control.checked;
      return;
    }
    values[key] = value;
  });
  // 未勾选的 checkbox 不进 FormData
  for (const input of Array.from(
    form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]'),
  )) {
    if (!(input.name in values)) values[input.name] = false;
  }
  return values;
}

function clearErrors(form: HTMLFormElement): void {
  for (const node of Array.from(form.querySelectorAll(".form-error"))) {
    node.remove();
  }
  for (const el of Array.from(form.querySelectorAll("[aria-invalid]"))) {
    el.removeAttribute("aria-invalid");
  }
}

function showFieldError(
  form: HTMLFormElement,
  fieldId: string,
  code: string,
  locale: AppLocale,
): void {
  const control = form.elements.namedItem(fieldId);
  const el = control instanceof RadioNodeList ? control[0] : control;
  if (!(el instanceof HTMLElement)) return;
  el.setAttribute("aria-invalid", "true");
  const wrap = el.closest(".form-field") ?? el.parentElement;
  if (!wrap) return;
  const span = document.createElement("span");
  span.className = "form-error";
  span.setAttribute("role", "alert");
  span.textContent = formErrorText(locale, code);
  wrap.append(span);
}

function showFormFailed(form: HTMLFormElement, locale: AppLocale): void {
  const actions = form.querySelector(".form-actions");
  if (!actions) return;
  const span = document.createElement("span");
  span.className = "form-error";
  span.setAttribute("role", "alert");
  span.textContent = formErrorText(locale, "site.form.failed");
  actions.append(span);
}

function showSuccess(form: HTMLFormElement): void {
  const message = form.getAttribute("data-success-message")?.trim() || "✓";
  const success = document.createElement("p");
  success.className = "form-success";
  success.setAttribute("role", "status");
  success.textContent = message;
  form.replaceWith(success);
}

async function submitForm(
  form: HTMLFormElement,
  context: SiteEnhanceContext,
): Promise<void> {
  const { locale } = context;
  const fields = fieldsFromForm(form);
  const values = valuesFromForm(form);
  clearErrors(form);

  const checked = validateFormValues(fields, values);
  if (!checked.ok) {
    for (const [fieldId, code] of Object.entries(checked.errors)) {
      showFieldError(form, fieldId, code, locale);
    }
    return;
  }

  const sectionId = form.getAttribute("data-section-id");
  if (!sectionId) {
    showFormFailed(form, locale);
    return;
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const response = await fetch("/api/public/site-form/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: context.pagePath,
        section_id: sectionId,
        values,
      }),
    });
    if (response.ok) {
      showSuccess(form);
      return;
    }
    const body = (await response.json().catch(() => null)) as {
      fields?: Record<string, string>;
    } | null;
    if (body?.fields) {
      for (const [fieldId, code] of Object.entries(body.fields)) {
        showFieldError(form, fieldId, code, locale);
      }
    } else {
      showFormFailed(form, locale);
    }
  } catch {
    showFormFailed(form, locale);
  } finally {
    if (button && document.contains(button)) button.disabled = false;
  }
}

/**
 * 事件委托挂在 document 上而不是逐个表单绑：段可能被会员正文那类局部替换重新插入，
 * 那时候再去补绑就晚了。
 */
export function enhanceSite(context: SiteEnhanceContext): void {
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.classList.contains("site-form")) return;
      event.preventDefault();
      void submitForm(form, context);
    },
    true,
  );
}
