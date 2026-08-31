import { isReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";

import { isThingKind, type ThingKind } from "../shared/thing.js";
import { isThingSlug } from "../shared/slug.js";

export const THING_TEXT_MAX_LENGTH = 10_000;
export const THING_HTML_MAX_LENGTH = 200_000;
export const THING_TITLE_MAX_LENGTH = 120;
export const THING_THUMBNAIL_MAX_LENGTH = 2_000;
/** 审计详情里只留一小段——正文可以很长，审计日志不该被整条灌满。 */
export const THING_PREVIEW_MAX_LENGTH = 60;

export function buildThingPreview(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= THING_PREVIEW_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, THING_PREVIEW_MAX_LENGTH)}…`;
}

export interface ThingInput {
  kind?: string;
  title?: string;
  slug?: string;
  text?: string;
  html?: string;
  thumbnail?: string;
  enabled?: boolean;
}

export interface ThingValidationIssue {
  code:
    | "useless.kind_invalid"
    | "useless.text_required"
    | "useless.text_too_long"
    | "useless.html_required"
    | "useless.html_too_long"
    | "useless.title_required"
    | "useless.title_too_long"
    | "useless.slug_invalid"
    | "useless.slug_reserved"
    | "useless.thumbnail_too_long";
  params?: Record<string, number>;
}

/**
 * 按 kind 校验：句子要正文，可交互的要 HTML 和标题。
 *
 * 标题对 embed 是必填——后台列表要靠它认这个东西，一段 HTML 没法当名字用。
 * 公开站**不画**这个名字：访客自己去摸，标题会把玩笑先说破。
 * text 则不必：正文自己就是标题。
 * slug 可空：空的话服务端从名字/正文起一个。
 */
export function validateThingInput(
  input: ThingInput,
  options: { partial?: boolean } = {},
): ThingValidationIssue | null {
  const partial = options.partial ?? false;

  if (input.kind !== undefined && !isThingKind(input.kind)) {
    return { code: "useless.kind_invalid" };
  }
  const kind = (input.kind ?? "text") as ThingKind;

  if (input.title !== undefined && input.title.length > THING_TITLE_MAX_LENGTH) {
    return {
      code: "useless.title_too_long",
      params: { max: THING_TITLE_MAX_LENGTH },
    };
  }

  if (input.slug !== undefined && input.slug.trim()) {
    const slug = input.slug.trim();
    if (!isThingSlug(slug)) {
      return { code: "useless.slug_invalid" };
    }
    if (isReservedPageSlug(slug)) {
      return { code: "useless.slug_reserved" };
    }
  }

  if (
    input.thumbnail !== undefined &&
    input.thumbnail.length > THING_THUMBNAIL_MAX_LENGTH
  ) {
    return {
      code: "useless.thumbnail_too_long",
      params: { max: THING_THUMBNAIL_MAX_LENGTH },
    };
  }

  if (kind === "embed") {
    if (!partial || input.html !== undefined) {
      const html = input.html?.trim() ?? "";
      if (!html) return { code: "useless.html_required" };
      if (html.length > THING_HTML_MAX_LENGTH) {
        return {
          code: "useless.html_too_long",
          params: { max: THING_HTML_MAX_LENGTH },
        };
      }
    }
    if (!partial || input.title !== undefined) {
      if (!(input.title?.trim() ?? "")) {
        return { code: "useless.title_required" };
      }
    }
    return null;
  }

  if (!partial || input.text !== undefined) {
    const text = input.text?.trim() ?? "";
    if (!text) return { code: "useless.text_required" };
    if (text.length > THING_TEXT_MAX_LENGTH) {
      return {
        code: "useless.text_too_long",
        params: { max: THING_TEXT_MAX_LENGTH },
      };
    }
  }

  return null;
}
