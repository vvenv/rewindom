import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDatabaseRestoreLocalPaths,
  listLocalRestoreCandidates,
  resolveAllowedLocalRestorePath,
} from "./backup-path.service.js";

vi.mock("@be-water/server-kernel/lib/config.js", () => ({
  config: {
    database: {
      restore: {
        localPaths: ["/backups", "/var/backups/app"],
      },
    },
  },
}));

vi.mock("./backup.service.js", () => ({
  assertCustomDumpFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs/promises", () => ({
  realpath: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
}));

describe("backup-path.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should expose configured local restore paths", () => {
    expect(getDatabaseRestoreLocalPaths()).toEqual([
      "/backups",
      "/var/backups/app",
    ]);
  });

  it("should resolve allowed absolute path", async () => {
    const { realpath, stat } = await import("node:fs/promises");
    const { assertCustomDumpFile } = await import("./backup.service.js");

    vi.mocked(realpath).mockImplementation(async (input) => {
      if (input === "/backups") return "/backups";
      return String(input);
    });
    vi.mocked(stat).mockResolvedValue({ isFile: () => true } as never);

    const resolved = await resolveAllowedLocalRestorePath(
      "/backups/app_backup_20260613.dump",
    );

    expect(resolved).toBe("/backups/app_backup_20260613.dump");
    expect(assertCustomDumpFile).toHaveBeenCalledWith(resolved);
  });

  it("should reject relative path", async () => {
    await expect(
      resolveAllowedLocalRestorePath("backups/file.dump"),
    ).rejects.toThrow("绝对路径");
  });

  it("should reject path outside allowed directories", async () => {
    const { realpath } = await import("node:fs/promises");
    vi.mocked(realpath).mockImplementation(async (input) => String(input));

    await expect(resolveAllowedLocalRestorePath("/etc/passwd")).rejects.toThrow(
      "不在允许目录内",
    );
  });

  it("should list dump candidates from allowed directories", async () => {
    const { realpath, readdir, stat } = await import("node:fs/promises");

    vi.mocked(realpath).mockImplementation(async (input) => String(input));
    vi.mocked(readdir).mockResolvedValue([
      "app_backup_old.dump",
      "notes.txt",
    ] as never);
    vi.mocked(stat).mockResolvedValue({
      isFile: () => true,
      size: 1024,
      mtimeMs: 100,
    } as never);

    const first = await listLocalRestoreCandidates();
    expect(
      first.some((item) => item.filename === "app_backup_old.dump"),
    ).toBe(true);
  });
});
