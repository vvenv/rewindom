import { isThingKind, type ThingKind } from "../../shared/index.js";

export const THING_TEXT_MAX_LENGTH = 10_000;
export const THING_HTML_MAX_LENGTH = 200_000;
export const THING_TITLE_MAX_LENGTH = 120;

export interface ThingFormValues {
  kind: ThingKind;
  title: string;
  text: string;
  html: string;
  /** `YYYY-MM-DD`；空串 = 不排期，交给系统随机绑。 */
  published_on: string;
  enabled: boolean;
}

/*
 * 默认不排期：整个产品的口径是「每天随机绑一个」，手工指定是例外而不是常态。
 * enabled 与 Prisma 的 @default(true) 对齐——新建即停用是反直觉的。
 */
export const INITIAL_THING_FORM: ThingFormValues = {
  kind: "text",
  title: "",
  text: "",
  html: "",
  published_on: "",
  enabled: true,
};

type ThingTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function validateThingForm(
  values: ThingFormValues,
  t: ThingTranslate,
): string | null {
  if (!isThingKind(values.kind)) {
    return t("validation.kindInvalid");
  }
  if (values.title.length > THING_TITLE_MAX_LENGTH) {
    return t("validation.titleTooLong", { max: THING_TITLE_MAX_LENGTH });
  }

  if (values.kind === "embed") {
    // 可交互的东西必须有名字：后台列表要靠它认，一段 HTML 当不了名字。
    // 公开站不画这个名字。
    if (!values.title.trim()) return t("validation.titleRequired");
    if (!values.html.trim()) return t("validation.htmlRequired");
    if (values.html.length > THING_HTML_MAX_LENGTH) {
      return t("validation.htmlTooLong", { max: THING_HTML_MAX_LENGTH });
    }
    return null;
  }

  const text = values.text.trim();
  if (!text) return t("validation.textRequired");
  if (text.length > THING_TEXT_MAX_LENGTH) {
    return t("validation.textTooLong", { max: THING_TEXT_MAX_LENGTH });
  }
  return null;
}

export function buildThingPayload(values: ThingFormValues): {
  kind: ThingKind;
  title: string;
  text: string;
  html: string;
  published_on: string | null;
  enabled: boolean;
} {
  const isEmbed = values.kind === "embed";
  return {
    kind: values.kind,
    title: values.title.trim(),
    // 另一种形态的字段清空，免得切换 kind 之后留着上一次的残留
    text: isEmbed ? "" : values.text.trim(),
    html: isEmbed ? values.html.trim() : "",
    published_on: values.published_on.trim() || null,
    enabled: values.enabled,
  };
}
