import { describe, expect, it } from "vitest";

import {
  emptyImportPreviewResult,
  formatImportCellError,
  importMissingRequiredColumnError,
  importMissingRequiredColumnPreview,
} from "./import.js";

describe("formatImportCellError", () => {
  it("includes current value when present", () => {
    expect(
      formatImportCellError({
        row: 3,
        column: "物流公司",
        value: "圆通",
        message: "未知物流公司：圆通",
      }),
    ).toBe("当前值「圆通」：未知物流公司：圆通");
  });

  it("omits value when empty", () => {
    expect(
      formatImportCellError({
        row: 2,
        column: "唯一ID",
        value: "",
        message: "唯一ID 为空",
      }),
    ).toBe("唯一ID 为空");
  });
});

describe("emptyImportPreviewResult", () => {
  it("returns empty table", () => {
    const result = emptyImportPreviewResult("Excel 文件为空");
    expect(result.valid).toBe(false);
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});

describe("importMissingRequiredColumnError", () => {
  it("returns null when column exists", () => {
    expect(
      importMissingRequiredColumnError(["唯一ID", "订单编号"], "唯一ID"),
    ).toBeNull();
  });

  it("returns file-level error when column is absent", () => {
    expect(importMissingRequiredColumnError(["订单编号"], "唯一ID")).toEqual({
      row: 0,
      column: "唯一ID",
      message: "缺少必需列「唯一ID」",
    });
  });
});

describe("importMissingRequiredColumnPreview", () => {
  it("returns null when column exists", () => {
    expect(
      importMissingRequiredColumnPreview(["唯一ID"], "唯一ID", 5),
    ).toBeNull();
  });

  it("returns file-level preview without rows when column is absent", () => {
    expect(importMissingRequiredColumnPreview(["单号"], "唯一ID", 5)).toEqual({
      valid: false,
      total_rows: 5,
      summary: {},
      errors: [{ row: 0, column: "唯一ID", message: "缺少必需列「唯一ID」" }],
      columns: [],
      rows: [],
    });
  });
});
