import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { config } from "../../lib/config.js";

import { LocalFileStorageProvider } from "./local-file-storage.js";

const storage = new LocalFileStorageProvider();
let baseDir: string;
let originalBaseDir: string;

async function drain(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

beforeAll(async () => {
  baseDir = await mkdtemp(join(tmpdir(), "rewindom-storage-"));
  originalBaseDir = config.storage.attachment.baseDir;
  config.storage.attachment.baseDir = baseDir;
});

afterAll(async () => {
  config.storage.attachment.baseDir = originalBaseDir;
  await rm(baseDir, { recursive: true, force: true });
});

describe("LocalFileStorageProvider", () => {
  it("put creates nested directories", async () => {
    await storage.put("tenant-1/site-assets/a.png", Buffer.from("bytes"), {
      mime_type: "image/png",
      visibility: "public",
    });

    await expect(
      readFile(join(baseDir, "tenant-1/site-assets/a.png"), "utf8"),
    ).resolves.toBe("bytes");
  });

  it("open returns stream and size", async () => {
    await storage.put("tenant-1/b.png", Buffer.from("hello"), {
      mime_type: "image/png",
      visibility: "public",
    });

    const object = await storage.open("tenant-1/b.png");
    expect(object?.size).toBe(5);
    // 本地磁盘不存元数据，MIME 由调用方兜底
    expect(object?.mime_type).toBeNull();
    await expect(drain(object!.stream)).resolves.toBe("hello");
  });

  it("open returns null for missing object instead of throwing", async () => {
    await expect(storage.open("tenant-1/nope.png")).resolves.toBeNull();
  });

  it("open returns null for a directory", async () => {
    await expect(storage.open("tenant-1")).resolves.toBeNull();
  });

  it("delete is idempotent", async () => {
    await storage.put("tenant-1/c.png", Buffer.from("x"), {
      mime_type: "image/png",
      visibility: "public",
    });
    await storage.delete("tenant-1/c.png");
    await expect(storage.delete("tenant-1/c.png")).resolves.toBeUndefined();
    await expect(storage.open("tenant-1/c.png")).resolves.toBeNull();
  });

  it("resolveUrl returns null so callers stream the bytes themselves", async () => {
    await expect(storage.resolveUrl()).resolves.toBeNull();
  });
});
