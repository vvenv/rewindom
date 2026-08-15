import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";

import {
  S3FileStorageProvider,
  assertS3StorageConfig,
  joinPublicObjectUrl,
  type S3StorageConfig,
} from "./s3-file-storage.js";

const completeConfig: S3StorageConfig = {
  endpoint: "https://abc.r2.cloudflarestorage.com",
  region: "auto",
  bucket: "rewindom-attachments",
  accessKeyId: "ak",
  secretAccessKey: "sk",
  publicBaseUrl: "https://media.example.com",
};

function drain(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  return (async () => {
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
  })();
}

function mockClient(send: S3Client["send"]): S3Client {
  return { send } as S3Client;
}

describe("assertS3StorageConfig", () => {
  it("s3 需要 bucket 与凭据", () => {
    expect(() =>
      assertS3StorageConfig(
        { ...completeConfig, bucket: "", accessKeyId: "", secretAccessKey: "" },
        "s3",
      ),
    ).toThrow(/S3_BUCKET.*S3_ACCESS_KEY_ID.*S3_SECRET_ACCESS_KEY/);
  });

  it("r2 额外需要 endpoint", () => {
    expect(() =>
      assertS3StorageConfig({ ...completeConfig, endpoint: "" }, "r2"),
    ).toThrow(/S3_ENDPOINT/);
  });

  it("完整配置通过", () => {
    expect(() => assertS3StorageConfig(completeConfig, "r2")).not.toThrow();
  });
});

describe("joinPublicObjectUrl", () => {
  it("去掉尾斜杠并编码路径段", () => {
    expect(
      joinPublicObjectUrl(
        "https://media.example.com/",
        "tenant-1/site-assets/a.png",
      ),
    ).toBe("https://media.example.com/tenant-1/site-assets/a.png");
  });
});

describe("S3FileStorageProvider", () => {
  it("put sends ContentType and public CacheControl", async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = new S3FileStorageProvider(
      mockClient(send),
      completeConfig.bucket,
      completeConfig.publicBaseUrl,
    );

    await storage.put("t/a.png", Buffer.from("bytes"), {
      mime_type: "image/png",
      visibility: "public",
    });

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "rewindom-attachments",
      Key: "t/a.png",
      ContentType: "image/png",
      ContentLength: 5,
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("open returns stream, size and mime", async () => {
    const send = vi.fn().mockResolvedValue({
      Body: Readable.from([Buffer.from("hello")]),
      ContentLength: 5,
      ContentType: "image/png",
    });
    const storage = new S3FileStorageProvider(
      mockClient(send),
      completeConfig.bucket,
      completeConfig.publicBaseUrl,
    );

    const object = await storage.open("t/b.png");
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand);
    expect(object?.size).toBe(5);
    expect(object?.mime_type).toBe("image/png");
    await expect(drain(object!.stream)).resolves.toBe("hello");
  });

  it("open returns null for missing object", async () => {
    const err = Object.assign(new Error("missing"), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    });
    const send = vi.fn().mockRejectedValue(err);
    const storage = new S3FileStorageProvider(
      mockClient(send),
      completeConfig.bucket,
      "",
    );

    await expect(storage.open("t/nope.png")).resolves.toBeNull();
  });

  it("open rethrows unexpected errors", async () => {
    const send = vi.fn().mockRejectedValue(new Error("network"));
    const storage = new S3FileStorageProvider(
      mockClient(send),
      completeConfig.bucket,
      "",
    );

    await expect(storage.open("t/a.png")).rejects.toThrow("network");
  });

  it("delete is idempotent when the object is already gone", async () => {
    const err = Object.assign(new Error("missing"), {
      name: "NotFound",
      $metadata: { httpStatusCode: 404 },
    });
    const send = vi.fn().mockRejectedValue(err);
    const storage = new S3FileStorageProvider(
      mockClient(send),
      completeConfig.bucket,
      "",
    );

    await expect(storage.delete("t/c.png")).resolves.toBeUndefined();
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });

  it("resolveUrl returns CDN URL when publicBaseUrl is set", async () => {
    const storage = new S3FileStorageProvider(
      mockClient(vi.fn()),
      completeConfig.bucket,
      "https://pub-xxx.r2.dev",
    );

    await expect(storage.resolveUrl("t/site-assets/a.png")).resolves.toBe(
      "https://pub-xxx.r2.dev/t/site-assets/a.png",
    );
  });

  it("resolveUrl returns null without publicBaseUrl so callers stream bytes", async () => {
    const storage = new S3FileStorageProvider(
      mockClient(vi.fn()),
      completeConfig.bucket,
      "",
    );

    await expect(storage.resolveUrl("t/a.png")).resolves.toBeNull();
  });
});
