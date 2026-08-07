import { error as errorResponse } from "@be-water/shared";

import { AppError } from "../lib/app-errors.js";
import { isServerMessageCode } from "../lib/i18n/format-message.js";
import { translateForRequest } from "../lib/i18n/translate.js";

import type { FastifyReply } from "fastify";

export type CodedErrorParams = Record<string, unknown>;

/** 构造已按请求语言翻译的 `{ error, code, params? }`。 */
export function buildCodedErrorBody(
  reply: FastifyReply,
  code: string,
  params?: CodedErrorParams,
): ReturnType<typeof errorResponse> & {
  code: string;
  params?: CodedErrorParams;
} {
  const message = translateForRequest(
    reply.request ?? { headers: {} },
    code,
    code,
    params,
  );
  return {
    error: message,
    code,
    ...(params ? { params } : {}),
  };
}

/** 以稳定 code 回写错误（推荐出口）。 */
export function sendCodedError(
  reply: FastifyReply,
  status: number,
  code: string,
  params?: CodedErrorParams,
): void {
  reply.code(status).send(buildCodedErrorBody(reply, code, params));
}

/**
 * `messageOrCode` 为稳定 code 时按 catalog 翻译；否则按自由文本回写
 *（供 ValidationError 解析器原文等少数出口）。
 */
export function resolveMessageOrCode(
  reply: FastifyReply,
  messageOrCode: string,
  errorCode?: string,
  params?: CodedErrorParams,
): ReturnType<typeof errorResponse> {
  if (isServerMessageCode(messageOrCode)) {
    return buildCodedErrorBody(reply, messageOrCode, params);
  }
  return errorResponse(messageOrCode, errorCode);
}

/** catch 里优先回写 AppError.code，否则用 fallback code。 */
export function sendAppErrorOr(
  reply: FastifyReply,
  err: unknown,
  fallbackCode: string,
  fallbackStatus = 400,
): void {
  if (err instanceof AppError && err.code) {
    sendCodedError(reply, err.status, err.code, err.params);
    return;
  }
  sendCodedError(reply, fallbackStatus, fallbackCode);
}
