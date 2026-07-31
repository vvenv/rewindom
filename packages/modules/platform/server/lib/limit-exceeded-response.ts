import {
  resolveRequestLocale,
} from "@be-water/server-kernel/lib/i18n/translate.js";
import { error } from "@be-water/shared";

import { LimitExceededError } from "./limit-exceeded.error.js";

import type { FastifyReply } from "fastify";

const LIMIT_LABEL_EN: Record<string, string> = {
  max_users: "Max users",
};

export function isLimitExceededError(err: unknown): err is LimitExceededError {
  return err instanceof LimitExceededError;
}

export function handleLimitExceededError(
  reply: FastifyReply,
  err: LimitExceededError,
): void {
  const locale = resolveRequestLocale(reply.request);
  const message =
    locale === "en"
      ? `Reached ${LIMIT_LABEL_EN[err.limitKey] ?? err.limitKey} (${err.limit}). Contact a platform admin to upgrade your plan.`
      : err.message;

  reply.code(403).send({
    ...error(message, "LIMIT_EXCEEDED"),
    limit_key: err.limitKey,
  });
}
