import "../test/platform.routes.test-mocks.js";
import { PLATFORM_ADMIN_USER_ID } from "@be-water/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildApp,
  platformToken,
  resetPlatformRouteMocks,
} from "../test/platform.routes.test-shared.js";

describe("platform-admin routes", () => {
  beforeEach(() => {
    resetPlatformRouteMocks();
  });

  it("returns system info for platform admin", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/system-info",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("environment");
  });

  it("cancels background job for platform admin", async () => {
    const { cancelBackgroundJobForUser } =
      await import("../../../background-job/server/job-exports.js");
    vi.mocked(cancelBackgroundJobForUser).mockResolvedValueOnce({
      job_id: "job-backup",
      type: "database_backup",
      status: "cancelled",
      title: "数据备份",
      description: "任务已取消",
      result: null,
      created_at: Date.now(),
      finished_at: Date.now(),
    });

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/background-jobs/job-backup/cancel",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(cancelBackgroundJobForUser).toHaveBeenCalledWith(
      "job-backup",
      PLATFORM_ADMIN_USER_ID,
    );
    expect(response.json().data.status).toBe("cancelled");
  });

  it("GET /background-jobs 返回后台任务列表", async () => {
    const { listBackgroundJobsForUser } =
      await import("../../../background-job/server/job-exports.js");
    vi.mocked(listBackgroundJobsForUser).mockResolvedValueOnce([
      {
        job_id: "job-1",
        type: "database_backup",
        status: "running",
        title: "数据备份",
        description: null,
        result: null,
        created_at: Date.now(),
        finished_at: null,
      },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/background-jobs",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(listBackgroundJobsForUser).toHaveBeenCalledWith(
      PLATFORM_ADMIN_USER_ID,
    );
  });

  it("GET /background-jobs/:job_id 返回任务详情", async () => {
    const { getBackgroundJobForUser } =
      await import("../../../background-job/server/job-exports.js");
    vi.mocked(getBackgroundJobForUser).mockResolvedValueOnce({
      id: "job-1",
      user_id: PLATFORM_ADMIN_USER_ID,
      type: "database_backup",
      status: "success",
      title: "数据备份",
      description: "完成",
      result: { filename: "backup.dump" },
      input: null,
      created_at: new Date(),
      updated_at: new Date(),
      finished_at: new Date(),
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/background-jobs/job-1",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe("job-1");
  });

  it("GET /background-jobs/:job_id 任务不存在返回 404", async () => {
    const { getBackgroundJobForUser } =
      await import("../../../background-job/server/job-exports.js");
    vi.mocked(getBackgroundJobForUser).mockResolvedValueOnce(null);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/background-jobs/nonexistent",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("POST /background-jobs/:job_id/cancel 任务不存在返回 404", async () => {
    const { cancelBackgroundJobForUser } =
      await import("../../../background-job/server/job-exports.js");
    vi.mocked(cancelBackgroundJobForUser).mockResolvedValueOnce("not_found");

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/background-jobs/nonexistent/cancel",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /users 返回平台用户列表", async () => {
    const { listPlatformUsers } =
      await import("../services/tenant-management.service.js");
    vi.mocked(listPlatformUsers).mockResolvedValueOnce({
      items: [
        {
          id: "user-1",
          username: "admin",
          tenant_slug: "acme",
          tenant_name: "Acme",
          is_system_admin: true,
          enabled: true,
          tenant_id: "tenant-2",
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/users?search=admin&page=1&page_size=10",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.items).toHaveLength(1);
    expect(listPlatformUsers).toHaveBeenCalledWith({
      search: "admin",
      skip: 0,
      take: 10,
    });
  });
});
