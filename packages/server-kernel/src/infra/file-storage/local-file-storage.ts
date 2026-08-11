import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { config } from "../../lib/config.js";

import type {
  FileStorageObject,
  FileStoragePutOptions,
  FileStorageProvider,
} from "./types.js";

/** 本地磁盘实现：单机部署与开发环境的默认后端。 */
export class LocalFileStorageProvider implements FileStorageProvider {
  async put(
    storageKey: string,
    buffer: Buffer,
    _options: FileStoragePutOptions,
  ): Promise<void> {
    const absolutePath = this.#resolvePath(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
  }

  async open(storageKey: string): Promise<FileStorageObject | null> {
    const absolutePath = this.#resolvePath(storageKey);
    const fileStat = await stat(absolutePath).catch(() => null);
    if (!fileStat?.isFile()) {
      return null;
    }
    return {
      stream: createReadStream(absolutePath),
      size: fileStat.size,
      // 本地磁盘不存 MIME，交给调用方按存储键或数据库记录兜底
      mime_type: null,
    };
  }

  async delete(storageKey: string): Promise<void> {
    await unlink(this.#resolvePath(storageKey)).catch(() => undefined);
  }

  async resolveUrl(): Promise<string | null> {
    // 本地磁盘不对外暴露，只能由服务端转发
    return null;
  }

  #resolvePath(storageKey: string): string {
    return join(config.storage.attachment.baseDir, storageKey);
  }
}
