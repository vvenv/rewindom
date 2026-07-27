import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  errorHandlerMiddleware,
  setErrorLogWriter,
  type ErrorLogContext,
} from "./error-handler.middleware.js";

const logError = vi.fn(
  async (_error: Error, _context: ErrorLogContext): Promise<void> => {},
);

vi.mock("../lib/config.js", () => ({
  config: {
    observability: {
      errorLog: {
        enabled: true,
        includeRequestBody: true,
        includeRequestParams: true,
        includeRequestQuery: true,
      },
    },
    server: {
      isProduction: false,
    },
  },
}));

describe("error-handler.middleware", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    setErrorLogWriter(logError);
    app = Fastify({ logger: false });
    await errorHandlerMiddleware(app);
  });

  it("should handle errors and log to database", async () => {
    const error = new Error("Test error");
    const mockRequest = {
      url: "/test",
      method: "GET",
      ip: "127.0.0.1",
      headers: { "user-agent": "test-agent" },
      authUser: { userId: "user-123", username: "testuser", role: "user" },
      body: { data: "test" },
      params: { id: "123" },
      query: { page: "1" },
    } as FastifyRequest;
    const mockReply = {
      statusCode: 500,
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await app.errorHandler(error, mockRequest, mockReply);

    expect(logError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        userId: "user-123",
        username: "testuser",
        route: "/test",
        method: "GET",
        ipAddress: "127.0.0.1",
        requestBody: JSON.stringify({ data: "test" }),
        requestParams: JSON.stringify({ id: "123" }),
        requestQuery: JSON.stringify({ page: "1" }),
      }),
    );
    expect(mockReply.code).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: "Test error",
      stack: error.stack,
    });
  });

  it("should handle errors without auth user", async () => {
    const error = new Error("Test error");
    const mockRequest = {
      url: "/test",
      method: "GET",
      ip: "127.0.0.1",
      headers: { "user-agent": "test-agent" },
      body: null,
      params: null,
      query: null,
    } as FastifyRequest;
    const mockReply = {
      statusCode: 500,
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await app.errorHandler(error, mockRequest, mockReply);

    expect(logError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        userId: undefined,
        username: undefined,
      }),
    );
  });

  it("should use error statusCode if available", async () => {
    const error = new Error("Not found");
    (error as { statusCode?: number }).statusCode = 404;
    const mockRequest = {
      url: "/test",
      method: "GET",
      ip: "127.0.0.1",
      headers: { "user-agent": "test-agent" },
      body: null,
      params: null,
      query: null,
    } as FastifyRequest;
    const mockReply = {
      statusCode: 500,
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await app.errorHandler(error, mockRequest, mockReply);

    expect(mockReply.code).toHaveBeenCalledWith(404);
  });

  it("should handle JSON stringify errors gracefully", async () => {
    const error = new Error("Test error");
    const circularObj = { a: 1 } as { a: number; self?: unknown };
    circularObj.self = circularObj;
    const mockRequest = {
      url: "/test",
      method: "POST",
      ip: "127.0.0.1",
      headers: { "user-agent": "test-agent" },
      body: circularObj,
      params: null,
      query: null,
    } as FastifyRequest;
    const mockReply = {
      statusCode: 500,
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await app.errorHandler(error, mockRequest, mockReply);

    expect(logError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        requestBody: undefined,
      }),
    );
  });

  it("should log to console", async () => {
    const error = new Error("Test error");
    const mockRequest = {
      url: "/test",
      method: "GET",
      ip: "127.0.0.1",
      headers: { "user-agent": "test-agent" },
      body: null,
      params: null,
      query: null,
    } as FastifyRequest;
    const mockReply = {
      statusCode: 500,
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    const logSpy = vi.spyOn(app.log, "error");

    await app.errorHandler(error, mockRequest, mockReply);

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Test error",
        route: "/test",
        method: "GET",
      }),
    );
  });

  it("should not include stack trace in production", async () => {
    const { config: configMock } = await import("../lib/config.js");
    configMock.server.isProduction = true;

    const error = new Error("Test error");
    const mockRequest = {
      url: "/test",
      method: "GET",
      ip: "127.0.0.1",
      headers: { "user-agent": "test-agent" },
      body: null,
      params: null,
      query: null,
    } as FastifyRequest;
    const mockReply = {
      statusCode: 500,
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await app.errorHandler(error, mockRequest, mockReply);

    expect(mockReply.send).toHaveBeenCalledWith({
      error: "Test error",
    });

    configMock.server.isProduction = false;
  });

  it("should skip error logging when disabled", async () => {
    const { config: configMock } = await import("../lib/config.js");
    configMock.observability.errorLog.enabled = false;

    const error = new Error("Test error");
    const mockRequest = {
      url: "/test",
      method: "GET",
      ip: "127.0.0.1",
      headers: { "user-agent": "test-agent" },
      body: null,
      params: null,
      query: null,
    } as FastifyRequest;
    const mockReply = {
      statusCode: 500,
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await app.errorHandler(error, mockRequest, mockReply);

    expect(logError).not.toHaveBeenCalled();

    configMock.observability.errorLog.enabled = true;
  });
});
