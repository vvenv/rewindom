import { useState, type CSSProperties, type ReactElement } from "react";

import {
  resolveSurfaceStyle,
  settingText,
  surfaceStyleCss,
} from "../../../../shared/section-schema.js";
import {
  resolveFormFields,
  validateFormValues,
  type FormField,
  type FormValues,
} from "../../../../shared/sections/form/fields.js";
import { formFieldDomId } from "../../../../shared/sections/form/html.js";
import { formErrorText } from "../../../../shared/sections/form/messages.js";
import { submitSiteForm } from "../../../lib/site-form-api.js";
import { SectionHeading, type SectionViewProps } from "../section-parts.js";
import { useSiteLocale } from "../site-locale-context.js";

/**
 * 表单段。结构与 SSR 的 `renderFormHtml` 同构（`section-structure.test.tsx` 守着），
 * 差别只有 SSR 不带的那部分：校验反馈、提交中、提交成功。
 */
export function FormSection({
  section,
  currentPath,
}: SectionViewProps): ReactElement | null {
  const fields = resolveFormFields(section);
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [failed, setFailed] = useState("");

  if (fields.length === 0) return null;
  const s = section.settings;

  if (state === "done") {
    return (
      <>
        <SectionHeading settings={s} />
        <p className="form-success" role="status">
          {settingText(s, "success_message") || "✓"}
        </p>
      </>
    );
  }

  const submit = async (): Promise<void> => {
    // 先本地校验：同一份 `validateFormValues`，服务端还会再验一遍
    const checked = validateFormValues(fields, values);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    setFailed("");
    setState("sending");
    const result = await submitSiteForm({
      path: currentPath,
      section_id: section.id,
      values,
    });
    if (result.ok) {
      setState("done");
      return;
    }
    // 服务端说哪个字段不行就标哪个；说不清就给一句整体失败
    setState("idle");
    if (result.errors) setErrors(result.errors);
    else setFailed("site.form.failed");
  };

  return (
    <>
      <SectionHeading settings={s} />
      <form
        className="site-form"
        data-section-id={section.id}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="form-grid">
          {section.blocks
            .filter((block) => block.type === "field")
            .map((block, index) => (
              <FieldRow
                key={block.id}
                field={fields[index]!}
                error={errors[fields[index]!.id]}
                value={values[fields[index]!.id]}
                style={
                  surfaceStyleCss(
                    resolveSurfaceStyle(block.settings),
                  ) as CSSProperties
                }
                onChange={(next) =>
                  setValues((prev) => ({ ...prev, [fields[index]!.id]: next }))
                }
              />
            ))}
        </div>
        <div className="form-actions">
          <button className="btn" type="submit" disabled={state === "sending"}>
            {settingText(s, "submit_label")}
          </button>
          {failed ? <FieldError code={failed} /> : null}
        </div>
      </form>
    </>
  );
}

function FieldRow({
  field,
  value,
  error,
  style,
  onChange,
}: {
  field: FormField;
  value: unknown;
  error?: string;
  style: CSSProperties;
  onChange: (next: string | boolean) => void;
}): ReactElement {
  const id = formFieldDomId(field.id);
  const className = [
    "form-field",
    field.wide ? "form-field-wide" : "",
    field.type === "checkbox" ? "form-check" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const label = (
    <>
      {field.label}
      {field.required ? (
        <span className="form-req" aria-hidden>
          *
        </span>
      ) : null}
    </>
  );
  const invalid = Boolean(error);

  if (field.type === "checkbox") {
    return (
      <div className={className} style={style}>
        <label htmlFor={id}>
          <input
            id={id}
            name={field.id}
            type="checkbox"
            required={field.required}
            aria-invalid={invalid}
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{label}</span>
        </label>
        {error ? <FieldError code={error} /> : null}
      </div>
    );
  }

  const shared = {
    id,
    name: field.id,
    required: field.required,
    "aria-invalid": invalid,
    value: typeof value === "string" ? value : "",
    onChange: (event: { target: { value: string } }) =>
      onChange(event.target.value),
  };

  return (
    <div className={className} style={style}>
      <label htmlFor={id}>{label}</label>
      {field.type === "textarea" ? (
        <textarea {...shared} rows={4} placeholder={field.placeholder} />
      ) : field.type === "select" ? (
        <select {...shared}>
          <option value="" />
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input {...shared} type={field.type} placeholder={field.placeholder} />
      )}
      {error ? <FieldError code={error} /> : null}
    </div>
  );
}

/** 校验 code → 文案。code 由 shared 层给；文案表在 `form/messages.ts`。 */
function FieldError({ code }: { code: string }): ReactElement {
  const locale = useSiteLocale();
  return (
    <span className="form-error" role="alert">
      {formErrorText(locale, code)}
    </span>
  );
}
