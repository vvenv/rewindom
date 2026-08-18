import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  requestTimingMiddleware,
  resetRequestTimingRecorder,
  setRequestTimingRecorder,
  type RequestTimingSample,
} from "./request-timing.middleware.js";

vi.mock("../lib/request-context.js", () => ({
  getRequestContext: () => ({
    route: "/api/notes/:noteId",
    method: "GET",
    tenant_id: "t-1",
    tenant_slug: "acme",
    user_id: "u-1",
    username: "ada",
    request_id: "req-ctx",
    source: "http",
  }),
}));

describe("request-timing.middleware", () => {
  let app: FastifyInstance;
  const recorder = vi.fn<(sample: RequestTimingSample) => void>();

  beforeEach(async () => {
    recorder.mockReset();
    setRequestTimingRecorder(recorder);
    app = Fastify({ logger: false });
    await requestTimingMiddleware(app);
    app.get("/api/notes/:noteId", async () => ({ ok: true }));
    app.get("/health", async () => ({ status: "ok" }));
    await app.ready();
  });

  afterEach(async () => {
    resetRequestTimingRecorder();
    await app.close();
  });

  it("records route pattern, status, and sets X-Response-Time", async () => {
    const response = await app.inject({ method: "GET", url: "/api/notes/n-1" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-response-time"]).toMatch(/^\d+ms$/);
    expect(recorder).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/api/notes/:noteId",
        path: "/api/notes/n-1",
        method: "GET",
        status_code: 200,
        tenant_slug: "acme",
        user_id: "u-1",
        username: "ada",
        source: "http",
      }),
    );
  });

  it("skips /health", async () => {
    await app.inject({ method: "GET", url: "/health" });
    expect(recorder).not.toHaveBeenCalled();
  });

  it("skips OPTIONS", async () => {
    await app.inject({ method: "OPTIONS", url: "/api/notes/n-1" });
    expect(recorder).not.toHaveBeenCalled();
  });
});
