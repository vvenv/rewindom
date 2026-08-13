import { buildCodedErrorBody } from "@rewindom/server-kernel/http/coded-error.js";
import { resolveRequestLocale } from "@rewindom/server-kernel/lib/i18n/translate.js";

import { TENANT_LIMIT_REGISTRY } from "../../shared/index.js";

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
  const registryLabel = TENANT_LIMIT_REGISTRY[err.limitKey]?.label;
  const label =
    locale === "en"
      ? (LIMIT_LABEL_EN[err.limitKey] ?? err.limitKey)
      : (registryLabel ?? err.limitKey);

  // 客户端契约保留 code=LIMIT_EXCEEDED + limit_key；文案走 catalog
  reply.code(403).send({
    ...buildCodedErrorBody(reply, "platform.limit_exceeded", {
      label,
      limit: err.limit,
    }),
    code: "LIMIT_EXCEEDED",
    limit_key: err.limitKey,
  });
}
