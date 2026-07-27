import { type ChildProcess, type exec as ExecFn } from "child_process";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { BACKUP_FILE_PREFIX } from "@be-water/shared";

import {
  BackupService,
  getDatabaseBackupFilePath,
  assertCustomDumpFile,
} from "./backup.service.js";

const { mockLogInfo, mockExecEmpty, mockExecError, asExecMock } = vi.hoisted(
  () => {
    type ExecCallback = (
      error: Error | null,
      stdout: string | Buffer,
      stderr: string | Buffer,
    ) => void;

    const fakeChildProcess = {} as ChildProcess;

    function getCallback<T extends (...args: never[]) => void>(
      args: unknown[],
    ): T | undefined {
      const last = args[args.length - 1];
      return typeof last === "function" ? (last as T) : undefined;
    }

    function mockExecEmpty(...args: unknown[]): ChildProcess {
      getCallback<ExecCallback>(args)?.(null, "", "");
      return fakeChildProcess;
    }
    function mockExecError(error: Error, ...args: unknown[]): ChildProcess {
      getCallback<ExecCallback>(args)?.(error, "", "");
      return fakeChildProcess;
    }

    const asExecMock = (
      fn: (...args: unknown[]) => ChildProcess,
    ): typeof ExecFn => fn as typeof ExecFn;

    return {
      mockLogInfo: vi.fn(),
      mockExecEmpty,
      mockExecError,
      asExecMock,
    };
  },
);

vi.mock("@be-water/server-kernel/lib/logger.js", () => ({
  createModuleLogger: vi.fn(() => ({
    info: mockLogInfo,
    error: vi.fn(),
  })),
}));

vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    database: {
      url: "postgresql://localhost:5432/test",
      backup: {
        pgDumpCompressLevel: 6,
      },
      restore: {
        parallelJobs: 4,
        maxUploadFileBytes: 10 * 1024 * 1024 * 1024,
        localPaths: ["/backups", "/var/backups/app"],
      },
    },
    storage: {
      export: {
        databaseBackup: {
          dir: "/var/www/app/storage/exports/backups",
        },
      },
    },
  },
}));

vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  unlink: vi.fn(),
  mkdtemp: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
  stat: vi.fn(),
  open: vi.fn(),
}));

describe("BackupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogInfo.mockClear();
  });

  describe("generateBackupToFile", () => {
    it("should write pg_dump custom format directly to job file", async () => {
      const { exec } = await import("child_process");
      const { unlink, mkdtemp, mkdir, stat, rename } =
        await import("fs/promises");

      vi.mocked(mkdtemp).mockResolvedValue(
        "/var/www/app/storage/exports/backups/.tmp/app_backup-backup-xxx",
      );
      vi.mocked(unlink).mockResolvedValue();
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(rename).mockResolvedValue(undefined);
      vi.mocked(stat).mockResolvedValue({ size: 500 } as Awaited<
        ReturnType<typeof stat>
      >);
      vi.mocked(exec).mockImplementation(asExecMock(mockExecEmpty));

      const result = await BackupService.generateBackupToFile(
        "postgresql://user:pass@localhost:5432/db",
        "job-abc",
      );

      expect(result.filename).toMatch(new RegExp(`^${BACKUP_FILE_PREFIX}_backup_.*\\.dump$`));
      expect(result.filePath).toContain("job-abc.dump");
      expect(result.size_bytes).toBe(500);
      expect(exec).toHaveBeenCalledWith(
        expect.stringMatching(/pg_dump.*--format=custom/),
        expect.objectContaining({ maxBuffer: 10 * 1024 * 1024 }),
        expect.any(Function),
      );
      expect(rename).toHaveBeenCalledWith(
        "/var/www/app/storage/exports/backups/.tmp/app_backup-backup-xxx/backup.dump",
        expect.stringContaining("job-abc.dump"),
      );
    });

    it("should throw when pg_dump fails", async () => {
      const { exec } = await import("child_process");
      const { unlink, mkdtemp, mkdir } = await import("fs/promises");

      vi.mocked(mkdtemp).mockResolvedValue(
        "/var/www/app/storage/exports/backups/.tmp/app_backup-backup-xxx",
      );
      vi.mocked(unlink).mockResolvedValue();
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(exec).mockImplementation(
        asExecMock((...args) =>
          mockExecError(new Error("pg_dump failed"), ...args),
        ),
      );

      await expect(
        BackupService.generateBackupToFile(
          "postgresql://user:pass@localhost:5432/db",
          "job-fail",
        ),
      ).rejects.toThrow("备份失败");
    });
  });

  describe("restoreBackupFromFile", () => {
    it("should restore custom dump with pg_restore", async () => {
      const { exec } = await import("child_process");
      const { stat, open } = await import("fs/promises");

      vi.mocked(stat).mockResolvedValue({ size: 1000 } as Awaited<
        ReturnType<typeof stat>
      >);
      vi.mocked(open).mockResolvedValue({
        read: vi.fn(async (buffer: Buffer) => {
          Buffer.from("PGDMP").copy(buffer);
          return { bytesRead: 5 };
        }),
        close: vi.fn().mockResolvedValue(undefined),
      } as never);
      vi.mocked(exec).mockImplementation(asExecMock(mockExecEmpty));

      await BackupService.restoreBackupFromFile(
        "postgresql://user:pass@localhost:5432/db",
        "/tmp/backup.dump",
      );

      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining("DROP SCHEMA IF EXISTS public CASCADE"),
        expect.any(Object),
        expect.any(Function),
      );
      expect(exec).toHaveBeenCalledWith(
        expect.stringMatching(/pg_restore.*-j 4.*backup\.dump/),
        expect.objectContaining({ maxBuffer: 50 * 1024 * 1024 }),
        expect.any(Function),
      );
    });

    it("should mask password in logs", async () => {
      const { exec } = await import("child_process");
      const { stat, open } = await import("fs/promises");

      vi.mocked(stat).mockResolvedValue({ size: 1000 } as Awaited<
        ReturnType<typeof stat>
      >);
      vi.mocked(open).mockResolvedValue({
        read: vi.fn(async (buffer: Buffer) => {
          Buffer.from("PGDMP").copy(buffer);
          return { bytesRead: 5 };
        }),
        close: vi.fn().mockResolvedValue(undefined),
      } as never);
      vi.mocked(exec).mockImplementation(asExecMock(mockExecEmpty));

      await BackupService.restoreBackupFromFile(
        "postgresql://user:password@localhost:5432/db",
        "/tmp/backup.dump",
      );

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          databaseUrl: "postgresql://user:****@localhost:5432/db",
        }),
        "开始恢复备份",
      );
    });
  });

  describe("getDatabaseBackupFilePath", () => {
    it("should return a path using the job id", () => {
      expect(getDatabaseBackupFilePath("job-123")).toContain("job-123.dump");
    });
  });

  describe("assertCustomDumpFile", () => {
    it("should resolve when dump file is valid", async () => {
      const { stat, open } = await import("fs/promises");
      vi.mocked(stat).mockResolvedValue({ size: 1000 } as Awaited<
        ReturnType<typeof stat>
      >);
      vi.mocked(open).mockResolvedValue({
        read: vi.fn(async (buffer: Buffer) => {
          Buffer.from("PGDMP").copy(buffer);
          return { bytesRead: 5 };
        }),
        close: vi.fn().mockResolvedValue(undefined),
      } as never);

      await expect(
        assertCustomDumpFile("/some/path/backup.dump"),
      ).resolves.toBeUndefined();
    });

    it("should throw when file is too small", async () => {
      const { stat } = await import("fs/promises");
      vi.mocked(stat).mockResolvedValue({ size: 10 } as Awaited<
        ReturnType<typeof stat>
      >);

      await expect(
        assertCustomDumpFile("/some/path/backup.dump"),
      ).rejects.toThrow("备份文件缺失或为空");
    });
  });
});
