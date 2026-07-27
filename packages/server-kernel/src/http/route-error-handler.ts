/**
 * Error handling utilities for route handlers
 * Standardized error logging and response functions
 */

import { error as errorResponse, success, type ImportPreviewResult  } from "@be-water/shared";

import type { FastifyReply } from "fastify";

/**
 * Standard error handler for route handlers
 * Logs error and returns standardized error response
 */
export function handleRouteError(
  reply: FastifyReply,
  err: unknown,
  context: string,
  errorCode?: string,
): void {
  const message = err instanceof Error ? err.message : String(err);
  reply.log.error(
    {
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
    },
    context,
  );
  reply.code(500).send(errorResponse(message, errorCode));
}

/**
 * Handle validation errors (400)
 */
export function handleValidationError(
  reply: FastifyReply,
  message: string,
  errorCode?: string,
): void {
  reply.code(400).send(errorResponse(message, errorCode));
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
 * Handle not found errors (404)
 */
export function handleNotFoundError(
  reply: FastifyReply,
  message: string,
): void {
  reply.code(404).send(errorResponse(message));
}

/**
 * Handle forbidden errors (403)
 */
export function handleForbiddenError(
  reply: FastifyReply,
  message: string = "无权限",
): void {
  reply.code(403).send(errorResponse(message));
}
