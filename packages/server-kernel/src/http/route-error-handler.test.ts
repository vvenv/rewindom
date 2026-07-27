import { describe, it, expect, vi } from "vitest";

import {
  handleRouteError,
  handleValidationError,
  handleImportValidationError,
  getImportValidationErrors,
  handleNotFoundError,
  handleForbiddenError,
} from "./route-error-handler.js";

import type { FastifyReply } from "fastify";

function makeMockReply(): FastifyReply {
  return {
    log: { error: vi.fn() },
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe("handleRouteError", () => {
  it("logs error and sends 500 with error message", () => {
    const reply = makeMockReply();
    const err = new Error("Something went wrong");

    handleRouteError(reply, err, "test context");

    expect(reply.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Something went wrong" }),
      "test context",
    );
    expect(reply.code).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Something went wrong" }),
    );
  });

  it("handles non-Error values by calling String()", () => {
    const reply = makeMockReply();

    handleRouteError(reply, "plain string error", "ctx");

    expect(reply.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: "plain string error" }),
      "ctx",
    );
    expect(reply.code).toHaveBeenCalledWith(500);
  });

  it("includes errorCode in the response when provided", () => {
    const reply = makeMockReply();

    handleRouteError(reply, new Error("fail"), "ctx", "MY_CODE");

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "fail" }),
    );
  });

  it("includes stack for Error instances", () => {
    const reply = makeMockReply();
    const err = new Error("stack test");

    handleRouteError(reply, err, "ctx");

    expect(reply.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ stack: err.stack }),
      "ctx",
    );
  });

  it("stack is undefined for non-Error values", () => {
    const reply = makeMockReply();

    handleRouteError(reply, 42, "ctx");

    expect(reply.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ stack: undefined }),
      "ctx",
    );
  });
});

describe("handleValidationError", () => {
  it("sends 400 with the message", () => {
    const reply = makeMockReply();

    handleValidationError(reply, "Invalid input");

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid input" }),
    );
  });

  it("includes errorCode when provided", () => {
    const reply = makeMockReply();

    handleValidationError(reply, "Invalid input", "INVALID_INPUT");

    expect(reply.send).toHaveBeenCalledWith({
      error: "Invalid input",
      code: "INVALID_INPUT",
    });
  });
});

describe("handleImportValidationError", () => {
  it("sends 400 with the preview result", () => {
    const reply = makeMockReply();
    const preview = {
      errors: [{ row: 1, message: "bad row" }],
      warnings: [],
      summary: { total: 1, valid: 0, invalid: 1 },
    };

    handleImportValidationError(reply, preview as never);

    expect(reply.code).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ data: preview }),
    );
  });
});

describe("getImportValidationErrors", () => {
  it("returns validation errors when present on the error", () => {
    const err = Object.assign(new Error("val error"), {
      validationErrors: [{ row: 1, message: "bad" }],
    });

    const result = getImportValidationErrors(err);

    expect(result).toEqual([{ row: 1, message: "bad" }]);
  });

  it("returns undefined for non-Error values", () => {
    expect(getImportValidationErrors("string")).toBeUndefined();
    expect(getImportValidationErrors(null)).toBeUndefined();
  });

  it("returns undefined when validationErrors is not an array", () => {
    const err = Object.assign(new Error("e"), { validationErrors: "oops" });
    expect(getImportValidationErrors(err)).toBeUndefined();
  });

  it("returns undefined when validationErrors is absent", () => {
    expect(getImportValidationErrors(new Error("plain"))).toBeUndefined();
  });
});

describe("handleNotFoundError", () => {
  it("sends 404 with resource not found message", () => {
    const reply = makeMockReply();

    handleNotFoundError(reply, "Document");

    expect(reply.code).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Document" }),
    );
  });
});

describe("handleForbiddenError", () => {
  it("sends 403 with custom message", () => {
    const reply = makeMockReply();

    handleForbiddenError(reply, "Access denied");

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Access denied" }),
    );
  });

  it("uses default Forbidden message when none provided", () => {
    const reply = makeMockReply();

    handleForbiddenError(reply);

    expect(reply.code).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "无权限" }),
    );
  });
});
