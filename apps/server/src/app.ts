import { config } from "@be-water/server-kernel/lib/config.js";
import { setupPrisma } from "@be-water/server-kernel/lib/prisma.js";
import { runWithRequestContext } from "@be-water/server-kernel/lib/request-context.js";
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

  app.addHook("onSend", async (request, reply) => {
    if (!request.url.startsWith("/api")) {
      return;
    }
    // All API responses are non-cacheable by default; only long-lived attachment
    // content may opt in via Cache-Control containing "immutable".
    const cacheControl = reply.getHeader("cache-control");
    if (
      typeof cacheControl === "string" &&
      cacheControl.includes("immutable")
    ) {
      return;
    }
    reply.header("Cache-Control", "no-store, no-cache, must-revalidate");
    reply.header("Pragma", "no-cache");
    reply.header("Expires", "0");
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
    return reply.code(404).send({ error: "接口不存在" });
  });

  return app;
}
