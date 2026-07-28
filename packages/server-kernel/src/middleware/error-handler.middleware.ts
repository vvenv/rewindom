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
  /** 已归一化的 JSON 值（`ErrorLog.request_body` 是 jsonb 列），不是序列化后的字符串 */
  requestBody?: unknown;
  requestParams?: string;
  requestQuery?: string;
  errorCode?: string;
  additionalContext?: Record<string, unknown>;
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

      // Serialize request data based on config
      let requestBody: unknown;
      let requestParams: string | undefined;
      let requestQuery: string | undefined;

      if (config.observability.errorLog.includeRequestBody) {
        try {
          if (request.body) {
            // stringify + parse 一步做两件事：把 Date / toJSON 等归一化成纯 JSON 值，
            // 同时在循环引用、BigInt 这类不可序列化的 body 上提前抛错——
            // 否则会留到 prisma.create() 里炸，而这里已经在错误处理器内部了。
            requestBody = JSON.parse(JSON.stringify(request.body));
          }
        } catch {
          requestBody = undefined;
        }
      }

      if (config.observability.errorLog.includeRequestParams) {
        try {
          if (request.params) {
            requestParams = JSON.stringify(request.params);
          }
        } catch {
          requestParams = undefined;
        }
      }

      if (config.observability.errorLog.includeRequestQuery) {
        try {
          if (request.query) {
            requestQuery = JSON.stringify(request.query);
          }
        } catch {
          requestQuery = undefined;
        }
      }

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
