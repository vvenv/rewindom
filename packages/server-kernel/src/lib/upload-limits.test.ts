import { describe, it, expect, vi } from "vitest";

vi.mock("./config.js", () => ({
  config: {
    database: {
      restore: {
        maxUploadFileBytes: 10 * 1024 * 1024 * 1024,
      },
    },
  },
}));

import {
  IMPORT_MAX_FILE_BYTES,
  DATABASE_RESTORE_MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  formatMaxUploadSize,
} from "./upload-limits.js";

describe("upload-limits", () => {
  describe("常量", () => {
    it("IMPORT_MAX_FILE_BYTES 为 100MB", () => {
      expect(IMPORT_MAX_FILE_BYTES).toBe(100 * 1024 * 1024);
    });

    it("DATABASE_RESTORE_MAX_FILE_BYTES 来自 config（默认 10GB）", () => {
      expect(DATABASE_RESTORE_MAX_FILE_BYTES).toBe(10 * 1024 * 1024 * 1024);
    });

    it("MAX_UPLOAD_BYTES 等于 DATABASE_RESTORE_MAX_FILE_BYTES", () => {
      expect(MAX_UPLOAD_BYTES).toBe(DATABASE_RESTORE_MAX_FILE_BYTES);
    });
  });

  describe("formatMaxUploadSize", () => {
    it("GB 级别显示 GB", () => {
      expect(formatMaxUploadSize(1 * 1024 * 1024 * 1024)).toBe("1GB");
      expect(formatMaxUploadSize(2.5 * 1024 * 1024 * 1024)).toBe("3GB");
      expect(formatMaxUploadSize(10 * 1024 * 1024 * 1024)).toBe("10GB");
    });

    it("MB 级别显示 MB", () => {
      expect(formatMaxUploadSize(100 * 1024 * 1024)).toBe("100MB");
      expect(formatMaxUploadSize(50 * 1024 * 1024)).toBe("50MB");
      expect(formatMaxUploadSize(1 * 1024 * 1024)).toBe("1MB");
    });

    it("小于 1MB 四舍五入为 0MB 或 1MB", () => {
      expect(formatMaxUploadSize(0.4 * 1024 * 1024)).toBe("0MB");
      expect(formatMaxUploadSize(0.6 * 1024 * 1024)).toBe("1MB");
    });

    it("边界值：刚好 1GB 显示 1GB", () => {
      expect(formatMaxUploadSize(1073741824)).toBe("1GB");
    });

    it("边界值：刚好小于 1GB 显示 MB", () => {
      expect(formatMaxUploadSize(1073741823)).toBe("1024MB");
    });
  });
});
