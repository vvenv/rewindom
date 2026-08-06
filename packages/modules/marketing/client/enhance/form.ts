/**
 * 公开站表单提交（无 React）。
 *
 * 校验用 shared `validateFormValues`；提交走 `POST /api/public/site/form`。
 */

import {
  validateFormValues,
  type FormField,
  type FormFieldType,
  type FormValues,
} from "../../shared/sections/form/fields.js";
import { formErrorText } from "../../shared/sections/form/messages.js";

import type { AppLocale } from "@be-water/shared";

function pageLocale(): AppLocale {
  const root = document.querySelector(".marketing-site-root");
  const raw = root?.getAttribute("data-page-locale") ?? document.documentElement.lang;
  return raw === "en" ? "en" : "zh-CN";
}

function pagePath(): string {
  const root = document.querySelector(".marketing-site-root");
  return root?.getAttribute("data-page-path") || "/";
}

function fieldsFromForm(form: HTMLFormElement): FormField[] {
  const fields: FormField[] = [];
  for (const el of form.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input[name], textarea[name], select[name]")) {
    const id = el.name;
    if (!id || fields.some((field) => field.id === id)) continue;
    const type = (el instanceof HTMLSelectElement
      ? "select"
      : el instanceof HTMLTextAreaElement
        ? "textarea"
        : el.type === "checkbox"
          ? "checkbox"
          : el.type === "email"
            ? "email"
            : el.type === "tel"
              ? "tel"
              : "text") as FormFieldType;
    const options =
      el instanceof HTMLSelectElement
        ? [...el.options]
            .map((option) => option.value)
            .filter((value) => value !== "")
        : [];
    const labelEl = form.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    const label =
      labelEl?.textContent?.replace(/\*$/u, "").trim() ||
      el.getAttribute("aria-label") ||
      id;
    fields.push({
      id,
      label,
      type,
      placeholder: el.getAttribute("placeholder") || "",
      required: el.required,
      options,
      wide: Boolean(el.closest(".form-field-wide")),
    });
  }
  return fields;
}

function valuesFromForm(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  const data = new FormData(form);
  for (const [key, value] of data.entries()) {
    if (typeof value !== "string") continue;
    const control = form.elements.namedItem(key);
    if (
      control instanceof HTMLInputElement &&
      control.type === "checkbox"
    ) {
      values[key] = control.checked;
      continue;
    }
    values[key] = value;
  }
  // 未勾选的 checkbox 不进 FormData
  for (const input of form.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"][name]',
  )) {
    if (!(input.name in values)) values[input.name] = false;
  }
  return values;
}

function clearErrors(form: HTMLFormElement): void {
  for (const node of form.querySelectorAll(".form-error")) {
    node.remove();
  }
  for (const el of form.querySelectorAll("[aria-invalid]")) {
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
  const el =
    control instanceof RadioNodeList ? control[0] : control;
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
  const message =
    form.getAttribute("data-success-message")?.trim() || "✓";
  const success = document.createElement("p");
  success.className = "form-success";
  success.setAttribute("role", "status");
  success.textContent = message;
  form.replaceWith(success);
}

async function submitForm(form: HTMLFormElement): Promise<void> {
  const locale = pageLocale();
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
    const response = await fetch("/api/public/site/form", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: pagePath(),
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

export function enhanceForms(): void {
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.classList.contains("site-form")) return;
      event.preventDefault();
      void submitForm(form);
    },
    true,
  );
}
