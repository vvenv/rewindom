import { getRequestContext } from "../lib/request-context.js";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestTimingStartedAt?: number;
  }
}

export interface RequestTimingSample {
  duration_ms: number;
  status_code: number;
  route: string;
  path: string;
  method: string;
  tenant_slug: string | null;
  user_id: string | null;
  username: string | null;
  request_id: string | null;
  source: "http";
}

type RequestTimingRecorder = (sample: RequestTimingSample) => void;

let recorder: RequestTimingRecorder | null = null;

const EXCLUDED_PATHS = new Set(["/health"]);
const PATH_MAX_LEN = 500;

export function setRequestTimingRecorder(
  next: RequestTimingRecorder | null,
): void {
  recorder = next;
}

export function resetRequestTimingRecorder(): void {
  recorder = null;
}

function requestPath(request: FastifyRequest): string {
  const raw = request.url.split("?")[0] ?? "";
  if (raw.length <= PATH_MAX_LEN) return raw;
  return raw.slice(0, PATH_MAX_LEN);
}

function requestRoute(request: FastifyRequest, path: string): string {
  const pattern = request.routeOptions.url;
  if (typeof pattern === "string" && pattern.length > 0) return pattern;
  return path;
}

function durationMs(request: FastifyRequest): number {
  const startedAt = request.requestTimingStartedAt;
  if (typeof startedAt !== "number" || startedAt <= 0) return 0;
  return Math.max(0, Date.now() - startedAt);
}

function shouldSkip(request: FastifyRequest, path: string): boolean {
  if (request.method === "OPTIONS") return true;
  if (EXCLUDED_PATHS.has(path)) return true;
  return false;
}

function emitSample(request: FastifyRequest, reply: FastifyReply): void {
  if (!recorder) return;
  const path = requestPath(request);
  if (shouldSkip(request, path)) return;

  const ctx = getRequestContext();
  recorder({
    duration_ms: durationMs(request),
    status_code: reply.statusCode,
    route: requestRoute(request, path),
    path,
    method: request.method,
    tenant_slug: ctx?.tenant_slug ?? request.tenantContext?.tenant_slug ?? null,
    user_id: ctx?.user_id ?? request.authUser?.userId ?? null,
    username: ctx?.username ?? request.authUser?.username ?? null,
    request_id: ctx?.request_id ?? request.id,
    source: "http",
  });
}

/**
 * Root-level request timing. Must be registered on the app instance (not a
 * child plugin) so it sees every route. The recorder is injected from the
 * slow-request module so the kernel never imports that package.
 */
export async function requestTimingMiddleware(
  app: FastifyInstance,
): Promise<void> {
  app.decorateRequest("requestTimingStartedAt", 0);

  app.addHook("onRequest", (request, _reply, done) => {
    request.requestTimingStartedAt = Date.now();
    done();
  });

  app.addHook("onSend", (request, reply, payload, done) => {
    reply.header("X-Response-Time", `${durationMs(request)}ms`);
    done(null, payload);
  });

  app.addHook("onResponse", (request, reply, done) => {
    try {
      emitSample(request, reply);
    } catch {
      // Timing must never fail the response.
    }
    done();
  });
}
