import "./background-job.routes.test-mocks.js";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

import { AuditAction } from "../../audit/shared/index.js";

const auditEmit = vi.hoisted(() => ({
  emitAuditLogFromRequestSafe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(
  "@be-water/server-kernel/runtime/audit-log-emit.js",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@be-water/server-kernel/runtime/audit-log-emit.js")
    >()),
    emitAuditLogFromRequestSafe: auditEmit.emitAuditLogFromRequestSafe,
  }),
);

import {
  setupBackgroundJobRouteTestSuite,
  teardownBackgroundJobRouteTestSuite,
  type TestApp,
  type TestUser,
} from "./background-job.routes.test-shared.js";

describe("Background Job Lifecycle Routes", () => {
  let app: TestApp;
  let adminUser: TestUser;

  beforeAll(async () => {
    ({ app, adminUser } = await setupBackgroundJobRouteTestSuite());
  });

  afterAll(async () => {
    await teardownBackgroundJobRouteTestSuite(app, adminUser.id);
  });

  describe("GET /api/background-jobs/:job_id", () => {
    it("should return 404 for non-existent job", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/background-jobs/non-existent-job",
        headers: {
          authorization: `Bearer ${adminUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const { error } = JSON.parse(response.payload);
      expect(error).toBe("任务不存在");
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/background-jobs/test-job",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return job data when job exists", async () => {
      const { getBackgroundJobForUser } = await import("./job-exports.js");
      vi.mocked(getBackgroundJobForUser).mockResolvedValueOnce({
        job_id: "test-job",
        type: "data_backup",
        status: "running",
        title: "Test Job",
        description: "Test description",
        result: null,
        created_at: Date.now(),
        finished_at: null,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/background-jobs/test-job",
        headers: {
          authorization: `Bearer ${adminUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data).toHaveProperty("job_id", "test-job");
      expect(data).toHaveProperty("status", "running");
    });
  });

  describe("POST /api/background-jobs/:job_id/cancel", () => {
    it("should return 404 for non-existent job", async () => {
      const { cancelBackgroundJobForUser } = await import("./job-exports.js");
      vi.mocked(cancelBackgroundJobForUser).mockResolvedValueOnce("not_found");

      const response = await app.inject({
        method: "POST",
        url: "/api/background-jobs/non-existent-job/cancel",
        headers: {
          authorization: `Bearer ${adminUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return cancelled job", async () => {
      const { cancelBackgroundJobForUser } = await import("./job-exports.js");
      vi.mocked(cancelBackgroundJobForUser).mockResolvedValueOnce({
        job_id: "test-job",
        type: "data_backup",
        status: "cancelled",
        title: "分析导出",
        description: "任务已取消",
        result: null,
        created_at: Date.now(),
        finished_at: Date.now(),
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/background-jobs/test-job/cancel",
        headers: {
          authorization: `Bearer ${adminUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(data.status).toBe("cancelled");
    });

    it("取消成功后写入 BACKGROUND_JOB_CANCEL 审计", async () => {
      const { cancelBackgroundJobForUser } = await import("./job-exports.js");
      vi.mocked(cancelBackgroundJobForUser).mockResolvedValueOnce({
        job_id: "test-job",
        type: "data_backup",
        status: "cancelled",
        title: "分析导出",
        description: "任务已取消",
        result: null,
        created_at: Date.now(),
        finished_at: Date.now(),
      });
      auditEmit.emitAuditLogFromRequestSafe.mockClear();

      const response = await app.inject({
        method: "POST",
        url: "/api/background-jobs/test-job/cancel",
        headers: {
          authorization: `Bearer ${adminUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const calls = auditEmit.emitAuditLogFromRequestSafe.mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][3]).toMatchObject({
        action: AuditAction.BACKGROUND_JOB_CANCEL,
        resource: "background_job:test-job",
      });
    });

    it("任务不存在时不写审计", async () => {
      const { cancelBackgroundJobForUser } = await import("./job-exports.js");
      vi.mocked(cancelBackgroundJobForUser).mockResolvedValueOnce("not_found");
      auditEmit.emitAuditLogFromRequestSafe.mockClear();

      const response = await app.inject({
        method: "POST",
        url: "/api/background-jobs/ghost-job/cancel",
        headers: {
          authorization: `Bearer ${adminUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      expect(auditEmit.emitAuditLogFromRequestSafe).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/background-jobs", () => {
    it("should return list of jobs", async () => {
      const { listBackgroundJobsForUser } = await import("./job-exports.js");
      vi.mocked(listBackgroundJobsForUser).mockResolvedValueOnce([
        {
          job_id: "job-1",
          type: "data_backup",
          status: "running",
          title: "Test Job",
          description: null,
          result: null,
          created_at: Date.now(),
          finished_at: null,
        },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/background-jobs",
        headers: {
          authorization: `Bearer ${adminUser.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const { data } = JSON.parse(response.payload);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty("job_id", "job-1");
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/background-jobs",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
