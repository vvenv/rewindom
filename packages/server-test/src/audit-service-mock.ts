import { vi } from "vitest";

import type { AuditLogEmitInput } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import type { AuditLogEventPayload } from "@be-water/server-kernel/runtime/domain-events.js";
import type { FastifyRequest } from "fastify";

export function createAuditEmitMock(): {
  emitAuditLog: ReturnType<typeof vi.fn>;
  emitAuditLogFromRequest: ReturnType<typeof vi.fn>;
  emitAuditLogFromRequestSafe: ReturnType<typeof vi.fn>;
  emitAuditLogSafe: ReturnType<typeof vi.fn>;
  emitDetachedAuditLogSafe: ReturnType<typeof vi.fn>;
} {
  const emitAuditLog = vi.fn().mockResolvedValue(undefined);
  const emitAuditLogFromRequest = vi.fn(
    async (
      _events: unknown,
      request: Pick<FastifyRequest, "tenantContext" | "ip" | "headers">,
      input: AuditLogEmitInput,
    ) => {
      const userAgent = request.headers["user-agent"];
      await emitAuditLog(_events, {
        ...input,
        tenant_slug:
          input.tenant_slug ?? request.tenantContext?.tenant_slug ?? null,
        ipAddress: input.ipAddress ?? request.ip,
        userAgent:
          input.userAgent ??
          (typeof userAgent === "string" ? userAgent : undefined),
      });
    },
  );
  const emitAuditLogSafe = vi.fn(
    async (
      events: unknown,
      _log: unknown,
      payload: AuditLogEventPayload,
    ) => {
      await emitAuditLog(events, payload);
    },
  );
  const emitAuditLogFromRequestSafe = vi.fn(
    async (
      events: unknown,
      _log: unknown,
      request: Pick<FastifyRequest, "tenantContext" | "ip" | "headers">,
      input: AuditLogEmitInput,
    ) => {
      await emitAuditLogFromRequest(events, request, input);
    },
  );
  const emitDetachedAuditLogSafe = vi.fn(
    async (_log: unknown, payload: AuditLogEventPayload) => {
      await emitAuditLog(null, payload);
    },
  );

  return {
    emitAuditLog,
    emitAuditLogFromRequest,
    emitAuditLogFromRequestSafe,
    emitAuditLogSafe,
    emitDetachedAuditLogSafe,
  };
}

/** @deprecated Prefer `createAuditEmitMock` after routes migrate to event bus. */
export function createAuditServiceMock(): {
  AuditService: {
    log: ReturnType<typeof vi.fn>;
    logFromRequest: ReturnType<typeof vi.fn>;
  };
} {
  const log = vi.fn().mockResolvedValue(undefined);
  const logFromRequest = vi.fn(
    async (
      request: Pick<FastifyRequest, "tenantContext" | "ip" | "headers">,
      input: AuditLogEmitInput,
    ) => {
      const userAgent = request.headers["user-agent"];
      await log({
        ...input,
        tenant_slug:
          input.tenant_slug ?? request.tenantContext?.tenant_slug ?? null,
        ipAddress: input.ipAddress ?? request.ip,
        userAgent:
          input.userAgent ??
          (typeof userAgent === "string" ? userAgent : undefined),
      });
    },
  );

  return {
    AuditService: {
      log,
      logFromRequest,
    },
  };
}
