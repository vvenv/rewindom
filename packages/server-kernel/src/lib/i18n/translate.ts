import {
  DEFAULT_LOCALE,
  normalizeLocale,
  parseAcceptLanguage,
  type AppLocale,
} from "@be-water/shared";

import { SERVER_MESSAGES_EN } from "./messages-en.js";

import type { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** 本次请求用于 API 文案翻译的语言。 */
    locale?: AppLocale;
  }
}

/**
 * 解析请求语言：显式 `request.locale` > `Accept-Language` > 默认 zh-CN。
 * 租户默认语言由前端读 appearance 后写入 Accept-Language，服务端不再二次查库。
 */
export function resolveRequestLocale(
  request: Pick<FastifyRequest, "headers" | "locale">,
): AppLocale {
  if (request.locale) return normalizeLocale(request.locale);
  const header = request.headers["accept-language"];
  const raw = Array.isArray(header) ? header[0] : header;
  return parseAcceptLanguage(raw, DEFAULT_LOCALE);
}

/** 将用户可见 API 文案翻到目标语言；zh-CN 原样返回。 */
export function translateApiMessage(
  locale: AppLocale,
  message: string,
  code?: string,
): string {
  if (normalizeLocale(locale) === "zh-CN") return message;

  if (code) {
    const byCode = SERVER_MESSAGES_EN[code];
    if (byCode) return byCode;
  }

  return SERVER_MESSAGES_EN[message] ?? message;
}

export function translateForRequest(
  request: Pick<FastifyRequest, "headers" | "locale">,
  message: string,
  code?: string,
): string {
  return translateApiMessage(resolveRequestLocale(request), message, code);
}
