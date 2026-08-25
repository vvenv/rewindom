import {
  CONTENT_TEMPLATE_FIELDS_MAX,
  CONTENT_TEMPLATE_NAME_MAX_LENGTH,
  CONTENT_TEMPLATE_SAMPLES_MAX,
  EMPTY_OUTPUT_RULES,
  type ContentFormat,
  type ContentOutputRules,
  type ContentTemplate,
  type ContentTemplateBody,
  type ContentTemplateField,
  type ContentTemplateSample,
} from "../../shared/index.js";

export interface TemplateFormValues {
  name: string;
  description: string;
  format: ContentFormat;
  fields: ContentTemplateField[];
  guidelines: string;
  output_rules: ContentOutputRules;
  samples: ContentTemplateSample[];
}

type ContentTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export const INITIAL_TEMPLATE_FORM: TemplateFormValues = {
  name: "",
  description: "",
  format: "note",
  fields: [],
  guidelines: "",
  output_rules: { ...EMPTY_OUTPUT_RULES },
  samples: [],
};

export function templateToForm(template: ContentTemplate): TemplateFormValues {
  return {
    name: template.name,
    description: template.description,
    format: template.format,
    fields: template.fields,
    guidelines: template.guidelines,
    output_rules: template.output_rules,
    samples: template.samples,
  };
}

/**
 * 新字段的 id 一次性生成后就不再变。
 *
 * 不按标签派生：租户把「写什么」改成「主题」时 id 不能跟着变，否则历史内容里
 * 那条填写记录就对不回这个字段了。
 */
export function newTemplateField(): ContentTemplateField {
  return {
    id: crypto.randomUUID(),
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    help: "",
    options: [],
  };
}

export function validateTemplateForm(
  values: TemplateFormValues,
  t: ContentTranslate,
): string | null {
  if (!values.name.trim()) {
    return t("template.validation.nameRequired");
  }
  if (values.name.length > CONTENT_TEMPLATE_NAME_MAX_LENGTH) {
    return t("template.validation.nameTooLong", {
      max: CONTENT_TEMPLATE_NAME_MAX_LENGTH,
    });
  }
  if (values.fields.length === 0) {
    return t("template.validation.fieldsRequired");
  }
  if (values.fields.length > CONTENT_TEMPLATE_FIELDS_MAX) {
    return t("template.validation.tooManyFields", {
      max: CONTENT_TEMPLATE_FIELDS_MAX,
    });
  }
  if (values.fields.some((field) => !field.label.trim())) {
    return t("template.validation.fieldLabelRequired");
  }
  if (
    values.fields.some(
      (field) => field.type === "select" && field.options.length === 0,
    )
  ) {
    return t("template.validation.optionsRequired");
  }
  if (values.samples.length > CONTENT_TEMPLATE_SAMPLES_MAX) {
    return t("template.validation.tooManySamples", {
      max: CONTENT_TEMPLATE_SAMPLES_MAX,
    });
  }
  return null;
}

export function buildTemplatePayload(
  values: TemplateFormValues,
): ContentTemplateBody {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    format: values.format,
    fields: values.fields.map((field) => ({
      ...field,
      label: field.label.trim(),
      placeholder: field.placeholder.trim(),
      help: field.help.trim(),
      // 只有下拉才留可选项：换过类型的字段不该拖着上一个类型的残留
      options: field.type === "select" ? field.options : [],
    })),
    guidelines: values.guidelines.trim(),
    output_rules: values.output_rules,
    samples: values.samples.filter((sample) => sample.body.trim().length > 0),
  };
}

/** 下拉可选项在界面上是「一行一个」，存的是数组。 */
export function optionsToText(options: string[]): string {
  return options.join("\n");
}

export function optionsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((option) => option.trim())
    .filter((option) => option.length > 0);
}
