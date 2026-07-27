import fastify from "fastify";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./route-error-handler.js", () => ({
  handleRouteError: vi.fn(),
}));

import { defineRoute } from "./define-route.js";
import { handleRouteError } from "./route-error-handler.js";


describe("defineRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps handler return value in success()", async () => {
    const app = fastify();
    defineRoute(app, {
      method: "GET",
      url: "/define-route-test",
      context: "[test] ok",
      errorCode: "TEST_OK",
      handler: async () => ({ items: [1, 2] }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/define-route-test",
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ data: { items: [1, 2] } });
  });

  it("does not send success when handler already sent reply", async () => {
    const app = fastify();
    defineRoute(app, {
      method: "GET",
      url: "/define-route-sent",
      context: "[test] sent",
      errorCode: "TEST_SENT",
      handler: async (_request, reply) => {
        return reply.code(201).send({ created: true });
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/define-route-sent",
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.payload)).toEqual({ created: true });
  });

  it("delegates thrown errors to handleRouteError", async () => {
    const app = fastify();
    const err = new Error("boom");
    defineRoute(app, {
      method: "GET",
      url: "/define-route-error",
      context: "[test] fail",
      errorCode: "TEST_FAIL",
      handler: async () => {
        throw err;
      },
    });

    await app.inject({ method: "GET", url: "/define-route-error" });

    expect(handleRouteError).toHaveBeenCalledWith(
      expect.anything(),
      err,
      "[test] fail",
      "TEST_FAIL",
    );
  });
});
