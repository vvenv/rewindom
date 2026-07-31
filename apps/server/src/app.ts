import { config } from "@be-water/server-kernel/lib/config.js";
import { translateForRequest } from "@be-water/server-kernel/lib/i18n/translate.js";
import { setupPrisma } from "@be-water/server-kernel/lib/prisma.js";
import { runWithRequestContext } from "@be-water/server-kernel/lib/request-context.js";
import { sendCodedError } from "@be-water/server-kernel/http/coded-error.js";
import {
  IMPORT_MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
} from "@be-water/server-kernel/lib/upload-limits.js";
import { authMiddleware } from "@be-water/server-kernel/middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "@be-water/server-kernel/middleware/error-handler.middleware.js";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance } from "fastify";

import { registerAllRoutes, registerModuleMiddleware } from "./routes/index.js";

import type { FastifyRequest } from "fastify";

function localizeApiErrorPayload(
  request: FastifyRequest,
  payload: unknown,
): unknown {
  if (typeof payload !== "string") return payload;
  try {
    const body = JSON.parse(payload) as {
      error?: unknown;
      code?: unknown;
      params?: unknown;
      [key: string]: unknown;
    };
    if (typeof body.error !== "string") return payload;
    const code = typeof body.code === "string" ? body.code : undefined;
    const params =
      body.params &&
      typeof body.params === "object" &&
      !Array.isArray(body.params)
        ? (body.params as Record<string, unknown>)
        : undefined;
    const translated = translateForRequest(request, body.error, code, params);
    if (translated === body.error) return payload;
    return JSON.stringify({ ...body, error: translated });
  } catch {
    return payload;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.server.logLevel,
    },
    trustProxy: true,
    bodyLimit: MAX_UPLOAD_BYTES,
  });

  await app.register(cors, {
    origin: true,
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (!request.url.startsWith("/api")) {
      return payload;
    }
    // All API responses are non-cacheable by default; only long-lived attachment
    // content may opt in via Cache-Control containing "immutable".
    const cacheControl = reply.getHeader("cache-control");
    if (
      typeof cacheControl === "string" &&
      cacheControl.includes("immutable")
    ) {
      return localizeApiErrorPayload(request, payload);
    }
    reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
    reply.header("Pragma", "no-cache");
    reply.header("Expires", "0");

    // 4xx/5xx `{ error }` 按 Accept-Language 边缘翻译，覆盖全部 API 错误出口。
    if (reply.statusCode >= 400) {
      return localizeApiErrorPayload(request, payload);
    }
    return payload;
  });

  await app.register(multipart, {
    limits: {
      fileSize: IMPORT_MAX_FILE_BYTES,
    },
  });

  await app.register(jwt, {
    secret: config.auth.jwtSecret,
  });

  await setupPrisma(app);

  // Request context —「慢查询归因」与「租户守卫」共用，必须在认证中间件之前建立。
  // 用回调式 hook（而非 async）把 done() 放进 ALS 的 run() 里，
  // 这样后续所有 hook / handler 都跑在同一个上下文中；无需 onResponse 清理，
  // 上下文随异步作用域自然结束。
  app.addHook("onRequest", (request, _reply, done) => {
    if (!request.url.startsWith("/api")) {
      done();
      return;
    }
    const requestPath = request.url.split("?")[0] ?? "";
    runWithRequestContext(
      {
        route: requestPath,
        method: request.method,
        tenant_id: null,
        tenant_slug: null,
        user_id: null,
        username: null,
        request_id: request.id,
        source: "http",
      },
      done,
    );
  });

  await authMiddleware(app);
  await registerModuleMiddleware(app);
  await errorHandlerMiddleware(app);
  await registerAllRoutes(app);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return sendCodedError(reply, 404, "common.endpoint_not_found");
  });

  return app;
}
