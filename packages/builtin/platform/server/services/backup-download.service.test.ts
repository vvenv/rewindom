import { describe, it, expect, beforeEach, vi } from "vitest";


import { BACKUP_FILE_PREFIX } from "@be-water/shared";

import {
  createDatabaseBackupDownloadToken,
  consumeDatabaseBackupDownloadToken,
  buildDatabaseBackupContentDisposition,
  openDatabaseBackupFileStream,
} from "./backup-download.service.js";

// ---------------------------------------------------------------------------
// Hoisted mock factories
// ---------------------------------------------------------------------------
const { redisClientMock } = vi.hoisted(() => ({
  redisClientMock: {
    status: "ready",
    on: vi.fn(),
    quit: vi.fn().mockResolvedValue(undefined),
    setex: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    set: vi.fn(),
    exists: vi.fn(),
    flushdb: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("@be-water/server-kernel/infra/redis.service.js", () => ({
  getRedisClient: () => redisClientMock,
  closeRedisConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@be-water/server-kernel/lib/logger.js", () => ({
  createModuleLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}));

vi.mock("./backup.service.js", () => ({
  getDatabaseBackupFilePath: vi.fn((jobId: string) => `/backups/${jobId}.dump`),
  assertCustomDumpFile: vi.fn().mockResolvedValue(undefined),
  BackupService: {
    openBackupReadStream: vi.fn(),
  },
}));


vi.mock("node:fs/promises", () => ({
  stat: vi.fn(),
}));

vi.mock("node:fs", () => ({
  createReadStream: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  redisClientMock.setex.mockResolvedValue("OK");
  redisClientMock.get.mockResolvedValue(null);
  redisClientMock.del.mockResolvedValue(1);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createDatabaseBackupDownloadToken", () => {
  it("should store a hex token payload in Redis with 120-second TTL", async () => {
    const mockSetex = vi.fn().mockResolvedValue("OK");
    redisClientMock.setex = mockSetex;

    const token = await createDatabaseBackupDownloadToken("job-1", "user-1");

    expect(typeof token).toBe("string");
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect(mockSetex).toHaveBeenCalledWith(
      `database_backup_dl:${token}`,
      120,
      expect.stringContaining('"job_id":"job-1"'),
    );
    const payload = JSON.parse(mockSetex.mock.calls[0][2] as string);
    expect(payload).toEqual({ job_id: "job-1", user_id: "user-1" });
  });

  it("should generate a unique token on each call", async () => {
    const t1 = await createDatabaseBackupDownloadToken("job-1", "user-1");
    const t2 = await createDatabaseBackupDownloadToken("job-1", "user-1");
    expect(t1).not.toBe(t2);
  });
});

describe("consumeDatabaseBackupDownloadToken", () => {
  it("should return payload and delete key when token and job_id match", async () => {
    const payload = { job_id: "job-1", user_id: "user-1" };
    const mockGet = vi.fn().mockResolvedValue(JSON.stringify(payload));
    const mockDel = vi.fn().mockResolvedValue(1);
    redisClientMock.get = mockGet;
    redisClientMock.del = mockDel;

    const result = await consumeDatabaseBackupDownloadToken("tok", "job-1");

    expect(result).toEqual(payload);
    expect(mockGet).toHaveBeenCalledWith("database_backup_dl:tok");
    expect(mockDel).toHaveBeenCalledWith("database_backup_dl:tok");
  });

  it("should return null when token does not exist in Redis", async () => {
    redisClientMock.get = vi.fn().mockResolvedValue(null);

    const result = await consumeDatabaseBackupDownloadToken("missing", "job-1");
    expect(result).toBeNull();
  });

  it("should return null and still delete key when job_id does not match", async () => {
    const payload = { job_id: "job-other", user_id: "user-1" };
    const mockGet = vi.fn().mockResolvedValue(JSON.stringify(payload));
    const mockDel = vi.fn().mockResolvedValue(1);
    redisClientMock.get = mockGet;
    redisClientMock.del = mockDel;

    const result = await consumeDatabaseBackupDownloadToken("tok", "job-1");

    expect(result).toBeNull();
    expect(mockDel).toHaveBeenCalled();
  });

  it("should return null when Redis value is invalid JSON", async () => {
    const mockDel = vi.fn().mockResolvedValue(1);
    redisClientMock.get = vi.fn().mockResolvedValue("not-json{{{");
    redisClientMock.del = mockDel;

    const result = await consumeDatabaseBackupDownloadToken("tok", "job-1");

    expect(result).toBeNull();
    expect(mockDel).toHaveBeenCalled();
  });
});

describe("buildDatabaseBackupContentDisposition", () => {
  it("should produce RFC 5987 header with ASCII filename", () => {
    const result = buildDatabaseBackupContentDisposition("backup.sql.zip");
    expect(result).toBe(
      `attachment; filename="backup.sql.zip"; filename*=UTF-8''backup.sql.zip`,
    );
  });

  it("should encode non-ASCII characters in filename*", () => {
    const result = buildDatabaseBackupContentDisposition("备份_2024.sql.zip");
    expect(result).toContain("filename*=UTF-8''");
    expect(result).toContain(encodeURIComponent("备份_2024.sql.zip"));
  });

  it("should replace non-ASCII characters with underscores in ASCII fallback", () => {
    const result = buildDatabaseBackupContentDisposition("备份.sql.zip");
    const asciiPart = result.match(/filename="([^"]+)"/)?.[1];
    expect(asciiPart).toMatch(/^[_\x20-\x7E]+$/);
    expect(asciiPart).toContain("_.sql.zip");
  });

  it("should use default fallback filename when input is empty", () => {
    const result = buildDatabaseBackupContentDisposition("");
    expect(result).toContain(`filename="${BACKUP_FILE_PREFIX}_backup.dump"`);
    expect(result).toContain(`filename*=UTF-8''`);
  });
});

describe("openDatabaseBackupFileStream", () => {
  it("should return stream, size, and filePath for a valid job", async () => {
    const { stat } = await import("node:fs/promises");
    const { BackupService, assertCustomDumpFile } =
      await import("./backup.service.js");

    const fakeStream = { pipe: vi.fn() } as never;
    vi.mocked(stat).mockResolvedValue({ size: 4096 } as never);
    vi.mocked(BackupService.openBackupReadStream).mockReturnValue(fakeStream);

    const result = await openDatabaseBackupFileStream("job-abc");

    expect(assertCustomDumpFile).toHaveBeenCalledWith("/backups/job-abc.dump");
    expect(stat).toHaveBeenCalledWith("/backups/job-abc.dump");
    expect(result).toEqual({
      stream: fakeStream,
      size: 4096,
      filePath: "/backups/job-abc.dump",
      contentType: "application/octet-stream",
    });
  });

  it("should throw when data backup file is too small", async () => {
    const { stat } = await import("node:fs/promises");
    const { assertCustomDumpFile } = await import("./backup.service.js");
    vi.mocked(assertCustomDumpFile).mockRejectedValueOnce(
      new Error("File not ready"),
    );
    vi.mocked(stat).mockResolvedValueOnce({ size: 10 } as never);

    await expect(openDatabaseBackupFileStream("job-small")).rejects.toThrow(
      "备份文件不存在或已过期",
    );
  });
});
