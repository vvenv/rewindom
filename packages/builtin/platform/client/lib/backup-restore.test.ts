import { describe, expect, it } from "vitest";

import {
  formatBackupSize,
  isDatabaseDumpFilename,
  sortLocalRestoreCandidates,
} from "./backup-restore.js";

import type { LocalRestoreCandidate } from "../../shared/index.js";

function candidate(
  filename: string,
  modified_at: number,
): LocalRestoreCandidate {
  return {
    file_path: `/var/backups/${filename}`,
    filename,
    size_bytes: 1024,
    modified_at,
  };
}

describe("formatBackupSize", () => {
  it("字节数不带小数", () => {
    expect(formatBackupSize(0)).toBe("0 B");
    expect(formatBackupSize(512)).toBe("512 B");
  });

  it("按 1024 进制升档", () => {
    expect(formatBackupSize(1024)).toBe("1.0 KB");
    expect(formatBackupSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatBackupSize(3.5 * 1024 * 1024 * 1024)).toBe("3.5 GB");
  });

  it("三位数以上省掉小数，避免列表里宽度乱跳", () => {
    expect(formatBackupSize(700 * 1024)).toBe("700 KB");
  });

  it("非法输入给占位符而不是 NaN", () => {
    expect(formatBackupSize(Number.NaN)).toBe("—");
    expect(formatBackupSize(-1)).toBe("—");
  });
});

describe("isDatabaseDumpFilename", () => {
  it("只认 .dump", () => {
    expect(isDatabaseDumpFilename("be-water_backup_1.dump")).toBe(true);
    expect(isDatabaseDumpFilename("backup.DUMP")).toBe(true);
    expect(isDatabaseDumpFilename(" backup.dump ")).toBe(true);
  });

  it("拒绝 sql / 压缩包等易混淆的格式", () => {
    expect(isDatabaseDumpFilename("backup.sql")).toBe(false);
    expect(isDatabaseDumpFilename("backup.dump.gz")).toBe(false);
    expect(isDatabaseDumpFilename("backup")).toBe(false);
  });
});

describe("sortLocalRestoreCandidates", () => {
  it("按修改时间倒序", () => {
    const sorted = sortLocalRestoreCandidates([
      candidate("old.dump", 100),
      candidate("new.dump", 300),
      candidate("mid.dump", 200),
    ]);

    expect(sorted.map((item) => item.filename)).toEqual([
      "new.dump",
      "mid.dump",
      "old.dump",
    ]);
  });

  it("不改动入参数组", () => {
    const input = [candidate("a.dump", 1), candidate("b.dump", 2)];
    sortLocalRestoreCandidates(input);
    expect(input.map((item) => item.filename)).toEqual(["a.dump", "b.dump"]);
  });
});
