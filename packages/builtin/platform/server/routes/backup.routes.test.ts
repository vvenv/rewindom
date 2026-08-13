import { Readable } from "node:stream";

import "../test/platform.routes.test-mocks.js";
import { PLATFORM_ADMIN_USER_ID } from "@rewindom/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildApp,
  platformToken,
  resetPlatformRouteMocks,
} from "../test/platform.routes.test-shared.js";

describe("platform-backup routes", () => {
  beforeEach(() => {
    resetPlatformRouteMocks();
  });

  it("starts database backup for platform admin", async () => {
    const { startDatabaseBackupBackgroundJob } =
      await import("../background-jobs/job-exports.js");
    vi.mocked(startDatabaseBackupBackgroundJob).mockResolvedValueOnce({
      job_id: "job-backup",
      type: "database_backup",
      status: "running",
      title: "数据备份",
      description: null,
      result: null,
      created_at: Date.now(),
      finished_at: null,
    });

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/database-backup",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: {},
    });

    expect(response.statusCode).toBe(202);
    expect(response.json().data.job_id).toBe("job-backup");
  });

  it("downloads backup with one-time download_token without Authorization", async () => {
    const { consumeDatabaseBackupDownloadToken, openDatabaseBackupFileStream } =
      await import("../services/backup-download.service.js");
    const { getDatabaseBackupJobForUser } =
      await import("../background-jobs/job-exports.js");

    vi.mocked(consumeDatabaseBackupDownloadToken).mockResolvedValue({
      job_id: "job-backup",
      user_id: PLATFORM_ADMIN_USER_ID,
    });
    vi.mocked(getDatabaseBackupJobForUser).mockResolvedValue({
      id: "job-backup",
      user_id: PLATFORM_ADMIN_USER_ID,
      type: "database_backup",
      status: "success",
      title: "数据备份",
      description: "完成",
      result: { filename: "app_backup.dump", size_bytes: 128 },
      input: null,
      created_at: new Date(),
      updated_at: new Date(),
      finished_at: new Date(),
    } as never);
    vi.mocked(openDatabaseBackupFileStream).mockResolvedValue({
      stream: Readable.from(Buffer.from("dump-bytes")) as never,
      size: 8,
      filePath: "/tmp/app_backup.dump",
      contentType: "application/octet-stream",
    });

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/backup/jobs/job-backup/download?download_token=abc123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/octet-stream");
    expect(consumeDatabaseBackupDownloadToken).toHaveBeenCalledWith(
      "abc123",
      "job-backup",
    );
  });

  it("POST /backup/jobs/:job_id/download-token 成功创建下载令牌", async () => {
    const { createDatabaseBackupDownloadToken } =
      await import("../services/backup-download.service.js");
    const { getDatabaseBackupJobForUser } =
      await import("../background-jobs/job-exports.js");
    const { openDatabaseBackupFileStream } =
      await import("../services/backup-download.service.js");
    vi.mocked(getDatabaseBackupJobForUser).mockResolvedValueOnce({
      id: "job-1",
      user_id: PLATFORM_ADMIN_USER_ID,
      type: "database_backup",
      status: "success",
      title: "数据备份",
      description: "完成",
      result: { filename: "app_backup.dump" },
      input: null,
      created_at: new Date(),
      updated_at: new Date(),
      finished_at: new Date(),
    } as never);
    vi.mocked(openDatabaseBackupFileStream).mockResolvedValueOnce({
      stream: {} as never,
      size: 100,
      filePath: "/tmp/app_backup.dump",
      contentType: "application/octet-stream",
    });
    vi.mocked(createDatabaseBackupDownloadToken).mockResolvedValueOnce(
      "token-abc123",
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/backup/jobs/job-1/download-token",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.download_token).toBe("token-abc123");
  });

  it("POST /backup/jobs/:job_id/download-token 备份未完成返回 409", async () => {
    const { getDatabaseBackupJobForUser } =
      await import("../background-jobs/job-exports.js");
    vi.mocked(getDatabaseBackupJobForUser).mockResolvedValueOnce({
      id: "job-1",
      user_id: PLATFORM_ADMIN_USER_ID,
      type: "database_backup",
      status: "running",
      title: "数据备份",
      description: null,
      result: null,
      input: null,
      created_at: new Date(),
      updated_at: new Date(),
      finished_at: null,
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/backup/jobs/job-1/download-token",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(409);
  });

  it("POST /backup/jobs/:job_id/download-token 任务不存在返回 404", async () => {
    const { getDatabaseBackupJobForUser } =
      await import("../background-jobs/job-exports.js");
    vi.mocked(getDatabaseBackupJobForUser).mockResolvedValueOnce(null);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/backup/jobs/job-1/download-token",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("GET /backup/jobs/:job_id/download 无 token 且已认证时下载备份", async () => {
    const { getDatabaseBackupJobForUser } =
      await import("../background-jobs/job-exports.js");
    const { openDatabaseBackupFileStream } =
      await import("../services/backup-download.service.js");

    vi.mocked(getDatabaseBackupJobForUser).mockResolvedValueOnce({
      id: "job-1",
      user_id: PLATFORM_ADMIN_USER_ID,
      type: "database_backup",
      status: "success",
      title: "数据备份",
      description: "完成",
      result: { filename: "app_backup.dump", size_bytes: 128 },
      input: null,
      created_at: new Date(),
      updated_at: new Date(),
      finished_at: new Date(),
    } as never);
    vi.mocked(openDatabaseBackupFileStream).mockResolvedValueOnce({
      stream: Readable.from(Buffer.from("dump-data")) as never,
      size: 10,
      filePath: "/tmp/app_backup.dump",
      contentType: "application/octet-stream",
    });

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/backup/jobs/job-1/download",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/octet-stream");
    expect(response.headers["content-disposition"]).toContain(
      "app_backup.dump",
    );
  });

  it("GET /backup/jobs/:job_id/download 无效 token 返回 401", async () => {
    const { consumeDatabaseBackupDownloadToken } =
      await import("../services/backup-download.service.js");
    vi.mocked(consumeDatabaseBackupDownloadToken).mockResolvedValueOnce(null);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/backup/jobs/job-1/download?download_token=bad-token",
    });

    expect(response.statusCode).toBe(401);
  });

  it("GET /restore/local-candidates 列出本地备份文件", async () => {
    const { listLocalRestoreCandidates } =
      await import("../services/backup-path.service.js");
    vi.mocked(listLocalRestoreCandidates).mockResolvedValueOnce([
      {
        file_path: "/backups/a.dump",
        filename: "a.dump",
        size_bytes: 1024,
        modified_at: Date.parse("2026-01-01"),
      },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/platform/restore/local-candidates",
      headers: { authorization: `Bearer ${platformToken(app)}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.candidates).toHaveLength(1);
  });

  it("POST /restore/local 本地路径还原成功", async () => {
    const { resolveAllowedLocalRestorePath } =
      await import("../services/backup-path.service.js");
    const { startDatabaseRestoreBackgroundJob } =
      await import("../background-jobs/job-exports.js");

    vi.mocked(resolveAllowedLocalRestorePath).mockResolvedValueOnce(
      "/backups/test.dump",
    );
    vi.mocked(startDatabaseRestoreBackgroundJob).mockResolvedValueOnce({
      job_id: "restore-job",
      type: "database_restore",
      status: "running",
      title: "数据库还原",
    } as never);

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/restore/local",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { file_path: "/backups/test.dump" },
    });

    expect(response.statusCode).toBe(202);
    expect(resolveAllowedLocalRestorePath).toHaveBeenCalledWith(
      "/backups/test.dump",
    );
    expect(startDatabaseRestoreBackgroundJob).toHaveBeenCalled();
    expect(response.json().data.job_id).toBe("restore-job");
  });

  it("POST /restore/local 缺少 file_path 返回 400", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/restore/local",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /restore/local 无效路径返回 400", async () => {
    const { resolveAllowedLocalRestorePath } =
      await import("../services/backup-path.service.js");
    vi.mocked(resolveAllowedLocalRestorePath).mockRejectedValueOnce(
      new Error("路径不在允许范围内"),
    );

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/platform/restore/local",
      headers: { authorization: `Bearer ${platformToken(app)}` },
      payload: { file_path: "/etc/passwd" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe("platform.path_not_file");
  });
});
