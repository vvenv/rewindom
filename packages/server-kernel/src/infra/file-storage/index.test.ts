import { describe, expect, it } from "vitest";

import { config } from "../../lib/config.js";

import { LocalFileStorageProvider } from "./local-file-storage.js";
import { S3FileStorageProvider } from "./s3-file-storage.js";

import { createFileStorageProvider } from "./index.js";

describe("createFileStorageProvider", () => {
  it("local 返回磁盘实现", () => {
    expect(createFileStorageProvider("local")).toBeInstanceOf(
      LocalFileStorageProvider,
    );
  });

  it("s3 缺凭据时抛出", () => {
    const original = { ...config.storage.attachment.s3 };
    Object.assign(config.storage.attachment.s3, {
      endpoint: "",
      bucket: "",
      accessKeyId: "",
      secretAccessKey: "",
      publicBaseUrl: "",
    });
    try {
      expect(() => createFileStorageProvider("s3")).toThrow(/S3_BUCKET/);
    } finally {
      Object.assign(config.storage.attachment.s3, original);
    }
  });

  it("s3 完整配置返回 S3 实现", () => {
    const original = { ...config.storage.attachment.s3 };
    config.storage.attachment.s3.endpoint =
      "https://abc.r2.cloudflarestorage.com";
    config.storage.attachment.s3.bucket = "rewindom-attachments";
    config.storage.attachment.s3.accessKeyId = "ak";
    config.storage.attachment.s3.secretAccessKey = "sk";
    try {
      expect(createFileStorageProvider("s3")).toBeInstanceOf(
        S3FileStorageProvider,
      );
      expect(createFileStorageProvider("r2")).toBeInstanceOf(
        S3FileStorageProvider,
      );
    } finally {
      Object.assign(config.storage.attachment.s3, original);
    }
  });

  it("未知后端抛出", () => {
    expect(() => createFileStorageProvider("ftp")).toThrow(
      /ATTACHMENT_STORAGE=ftp/,
    );
  });
});
