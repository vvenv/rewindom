/**
 * Error handling utilities for route handlers
 * Standardized error logging and response functions
 */

import { success, type ImportPreviewResult } from "@be-water/shared";

import { AppError, hasErrorCode } from "../lib/app-errors.js";

import {
  resolveMessageOrCode,
  sendCodedError,
  type CodedErrorParams,
} from "./coded-error.js";

import type { FastifyReply } from "fastify";

export {
  sendCodedError,
  sendAppErrorOr,
  buildCodedErrorBody,
} from "./coded-error.js";
export type { CodedErrorParams } from "./coded-error.js";

/**
 * Standard error handler for route handlers
 * Logs error and returns standardized error response
 */
export function handleRouteError(
  reply: FastifyReply,
  err: unknown,
  context: string,
  errorCode = "common.internal_error",
): void {
  const message = err instanceof Error ? err.message : String(err);
  reply.log.error(
    {
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    },
    context,
  );
  if (err instanceof AppError && err.code && hasErrorCode(err, err.code)) {
    sendCodedError(reply, err.status, err.code, err.params);
    return;
  }
  sendCodedError(reply, 500, errorCode);
}

/**
 * Handle validation errors (400). Prefer stable message codes.
 */
export function handleValidationError(
  reply: FastifyReply,
  messageOrCode: string,
  errorCode?: string,
  params?: CodedErrorParams,
): void {
  reply.code(400).send(resolveMessageOrCode(reply, messageOrCode, errorCode, params));
}

export function handleImportValidationError(
  reply: FastifyReply,
  preview: ImportPreviewResult,
): void {
  reply.code(400).send(success(preview));
}

export function getImportValidationErrors(
  err: unknown,
): ImportPreviewResult["errors"] | undefined {
  if (
    err instanceof Error &&
    "validationErrors" in err &&
    Array.isArray(err.validationErrors)
  ) {
    return err.validationErrors as ImportPreviewResult["errors"];
  }
  return undefined;
}

/**
 * Handle not found errors (404). Prefer stable message codes.
 */
export function handleNotFoundError(
  reply: FastifyReply,
  messageOrCode: string,
  params?: CodedErrorParams,
): void {
  reply.code(404).send(resolveMessageOrCode(reply, messageOrCode, undefined, params));
}

/**
 * Handle forbidden errors (403). Prefer stable message codes.
 */
export function handleForbiddenError(
  reply: FastifyReply,
  messageOrCode: string = "common.forbidden",
  params?: CodedErrorParams,
): void {
  reply.code(403).send(resolveMessageOrCode(reply, messageOrCode, undefined, params));
}
