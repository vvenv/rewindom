import { config } from "../lib/config.js";

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export interface ErrorLogContext {
  userId?: string;
  username?: string;
  tenantSlug: string | null;
  route: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  /** 以下三项是已归一化的 JSON 值（对应 jsonb 列），不是序列化后的字符串 */
  requestBody?: unknown;
  requestParams?: unknown;
  requestQuery?: unknown;
  errorCode?: string;
  additionalContext?: Record<string, unknown>;
}

/**
 * 归一化成可直接写进 jsonb 列的纯 JSON 值。
 *
 * stringify + parse 一步做两件事：把 Date / 自定义 toJSON 展开成纯 JSON，
 * 同时在循环引用、BigInt 这类不可序列化的输入上就地失败并返回 undefined——
 * 否则会留到 prisma.create() 里抛，而那时已经在错误处理器内部了。
 */
function toJsonValue(value: unknown): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

type ErrorLogWriter = (
  error: Error,
  context: ErrorLogContext,
) => Promise<void>;

let errorLogWriter: ErrorLogWriter | null = null;

export function setErrorLogWriter(writer: ErrorLogWriter): void {
  errorLogWriter = writer;
}

/**
 * Global error handler middleware
 * Catches all errors and logs them to the ErrorLog database
 * Follows Fastify best practices for error handling
 */
export async function errorHandlerMiddleware(app: FastifyInstance) {
  app.setErrorHandler(
    async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      // Extract user information if available
      const userId = request.authUser?.userId;
      const username = request.authUser?.username;
      const tenantSlug = request.tenantContext?.tenant_slug ?? null;

      // Extract request information
      const route = request.url;
      const method = request.method;
      const ipAddress = request.ip;
      const userAgent = request.headers["user-agent"];

      // Normalize request data based on config
      const requestBody = config.observability.errorLog.includeRequestBody
        ? toJsonValue(request.body)
        : undefined;
      const requestParams = config.observability.errorLog.includeRequestParams
        ? toJsonValue(request.params)
        : undefined;
      const requestQuery = config.observability.errorLog.includeRequestQuery
        ? toJsonValue(request.query)
        : undefined;

      // Determine error code
      let errorCode: string | undefined;
      if (error.name) {
        errorCode = error.name;
      }

      // Log the error to database if enabled
      if (config.observability.errorLog.enabled) {
        await errorLogWriter?.(error, {
          userId,
          username,
          tenantSlug,
          route,
          method,
          ipAddress,
          userAgent,
          requestBody,
          requestParams,
          requestQuery,
          errorCode,
          additionalContext: {
            statusCode: reply.statusCode,
          },
        });
      }

      // Log to console for immediate visibility
      app.log.error({
        error: error.message,
        stack: error.stack,
        route,
        method,
        userId,
        username,
      });

      // Use statusCode from error if available (Fastify best practice)
      const statusCode = (error as { statusCode?: number }).statusCode || 500;

      // Send error response
      // Fastify will handle serialization and headers automatically
      return reply.code(statusCode).send({
        error: error.message,
        ...(!config.server.isProduction && { stack: error.stack }),
      });
    },
  );
}
