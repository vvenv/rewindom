import { error } from "@be-water/shared";

import { LimitExceededError } from "./limit-exceeded.error.js";

import type { FastifyReply } from "fastify";

export function isLimitExceededError(err: unknown): err is LimitExceededError {
  return err instanceof LimitExceededError;
}

export function handleLimitExceededError(
  reply: FastifyReply,
  err: LimitExceededError,
): void {
  reply.code(403).send({
    ...error(err.message, "LIMIT_EXCEEDED"),
    limit_key: err.limitKey,
  });
}
