import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type {
  FileStorageObject,
  FileStoragePutOptions,
  FileStorageProvider,
} from "./types.js";

export interface S3StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** 公开读的 CDN / r2.dev / 自定义域；空则 `resolveUrl` 返回 null，由应用转发字节。 */
  publicBaseUrl: string;
}

const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";
const PRIVATE_CACHE_CONTROL = "private, max-age=31536000, immutable";

/** S3 兼容对象存储（Cloudflare R2 / AWS S3 / MinIO）。 */
export class S3FileStorageProvider implements FileStorageProvider {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly publicBaseUrl: string,
  ) {}

  static fromConfig(
    s3: S3StorageConfig,
    kind: "s3" | "r2" = "s3",
  ): S3FileStorageProvider {
    assertS3StorageConfig(s3, kind);
    return new S3FileStorageProvider(
      createS3Client(s3),
      s3.bucket,
      s3.publicBaseUrl,
    );
  }

  async put(
    storageKey: string,
    buffer: Buffer,
    options: FileStoragePutOptions,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: options.mime_type,
        ContentLength: buffer.byteLength,
        CacheControl:
          options.cache_control ??
          (options.visibility === "public"
            ? PUBLIC_CACHE_CONTROL
            : PRIVATE_CACHE_CONTROL),
      }),
    );
  }

  async open(storageKey: string): Promise<FileStorageObject | null> {
    try {
      const output = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      const stream = toReadable(output.Body);
      if (!stream) {
        return null;
      }
      return {
        stream,
        size: output.ContentLength ?? 0,
        mime_type: output.ContentType ?? null,
      };
    } catch (err) {
      if (isS3NotFound(err)) {
        return null;
      }
      throw err;
    }
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
    } catch (err) {
      if (isS3NotFound(err)) {
        return;
      }
      throw err;
    }
  }

  async resolveUrl(storageKey: string): Promise<string | null> {
    if (!this.publicBaseUrl) {
      return null;
    }
    return joinPublicObjectUrl(this.publicBaseUrl, storageKey);
  }
}

export function createS3Client(s3: S3StorageConfig): S3Client {
  return new S3Client({
    region: s3.region || "auto",
    ...(s3.endpoint ? { endpoint: s3.endpoint } : {}),
    credentials: {
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
    },
    // 自定义 endpoint（R2 / MinIO）用 path-style，避免虚拟主机名解析不到
    forcePathStyle: Boolean(s3.endpoint),
    // AWS SDK 默认给所有请求加 CRC32，R2 / 部分 S3 兼容实现会拒
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function assertS3StorageConfig(s3: S3StorageConfig, kind: string): void {
  const missing: string[] = [];
  if (!s3.bucket) missing.push("S3_BUCKET");
  if (!s3.accessKeyId) missing.push("S3_ACCESS_KEY_ID");
  if (!s3.secretAccessKey) missing.push("S3_SECRET_ACCESS_KEY");
  if (kind === "r2" && !s3.endpoint) missing.push("S3_ENDPOINT");
  if (missing.length > 0) {
    throw new Error(`ATTACHMENT_STORAGE=${kind} 缺少 ${missing.join("、")}`);
  }
}

export function joinPublicObjectUrl(base: string, storageKey: string): string {
  const origin = base.replace(/\/+$/, "");
  const path = storageKey
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");
  return `${origin}/${path}`;
}

function toReadable(body: unknown): Readable | null {
  if (!body) {
    return null;
  }
  if (body instanceof Readable) {
    return body;
  }
  return null;
}

function isS3NotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") {
    return false;
  }
  const name = "name" in err && typeof err.name === "string" ? err.name : "";
  if (name === "NoSuchKey" || name === "NotFound") {
    return true;
  }
  const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
    ?.httpStatusCode;
  return status === 404;
}
