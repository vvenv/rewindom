import { config } from "../../lib/config.js";

import { LocalFileStorageProvider } from "./local-file-storage.js";
import { S3FileStorageProvider } from "./s3-file-storage.js";

import type { FileStorageProvider } from "./types.js";

export type {
  FileStorageObject,
  FileStoragePutOptions,
  FileStorageProvider,
} from "./types.js";

let provider: FileStorageProvider | null = null;

/**
 * 取当前进程的文件存储后端。
 *
 * 接 OSS/S3/R2 只需在 {@link createFileStorageProvider} 加一个分支 + 一个实现文件，
 * 业务侧一行不用改——它们只见到 `FileStorageProvider`。
 */
export function getFileStorageProvider(): FileStorageProvider {
  provider ??= createFileStorageProvider(config.storage.attachment.storage);
  return provider;
}

export function createFileStorageProvider(kind: string): FileStorageProvider {
  switch (kind) {
    case "local":
      return new LocalFileStorageProvider();
    case "s3":
    case "r2":
      return S3FileStorageProvider.fromConfig(
        config.storage.attachment.s3,
        kind,
      );
    default:
      throw new Error(
        `不支持的文件存储后端 ATTACHMENT_STORAGE=${kind}（当前支持：local、s3、r2）`,
      );
  }
}
