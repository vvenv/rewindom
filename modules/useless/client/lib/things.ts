import { isReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";

import { isThingKind, type ThingKind } from "../../shared/index.js";

export const THING_TEXT_MAX_LENGTH = 10_000;
export const THING_HTML_MAX_LENGTH = 200_000;
export const THING_TITLE_MAX_LENGTH = 120;

export interface ThingFormValues {
  kind: ThingKind;
  title: string;
  slug: string;
  text: string;
  html: string;
  thumbnail: string;
  enabled: boolean;
}

export const INITIAL_THING_FORM: ThingFormValues = {
  kind: "text",
  title: "",
  slug: "",
  text: "",
  html: "",
  thumbnail: "",
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
  if (values.slug.trim() && /[/#?=]/.test(values.slug.trim())) {
    return t("validation.slugInvalid");
  }
  if (values.slug.trim() && isReservedPageSlug(values.slug.trim())) {
    return t("validation.slugReserved");
  }

  if (values.kind === "embed") {
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
  slug: string | undefined;
  text: string;
  html: string;
  thumbnail: string;
  enabled: boolean;
} {
  const isEmbed = values.kind === "embed";
  const slug = values.slug.trim();
  return {
    kind: values.kind,
    title: values.title.trim(),
    slug: slug || undefined,
    text: isEmbed ? "" : values.text.trim(),
    html: isEmbed ? values.html.trim() : "",
    thumbnail: values.thumbnail.trim(),
    enabled: values.enabled,
  };
}
