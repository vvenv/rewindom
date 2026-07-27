import { describe, expect, it } from "vitest";

import {
  DATABASE_BACKUP_IDLE_TIMEOUT_MS,
  DATABASE_RESTORE_IDLE_TIMEOUT_MS,
  EXPORT_DOWNLOAD_TIMEOUT_MS,
} from "./export.js";

describe("export timeouts", () => {
  it("EXPORT_DOWNLOAD_TIMEOUT_MS 应为 10 分钟", () => {
    expect(EXPORT_DOWNLOAD_TIMEOUT_MS).toBe(10 * 60 * 1000);
  });

  it("DATABASE_BACKUP_IDLE_TIMEOUT_MS 应为 25 分钟", () => {
    expect(DATABASE_BACKUP_IDLE_TIMEOUT_MS).toBe(25 * 60 * 1000);
  });

  it("DATABASE_RESTORE_IDLE_TIMEOUT_MS 应为 25 分钟", () => {
    expect(DATABASE_RESTORE_IDLE_TIMEOUT_MS).toBe(25 * 60 * 1000);
  });
});
