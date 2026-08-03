import { createReadStream } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import { config } from "../../lib/config.js";

export interface FileStoragePutMeta {
  mime_type: string;
}

export interface FileStorageProvider {
  put(
    storageKey: string,
    buffer: Buffer,
    meta: FileStoragePutMeta,
  ): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
  createReadStream(storageKey: string): ReturnType<typeof createReadStream>;
  delete(storageKey: string): Promise<void>;
  resolveAbsolutePath(storageKey: string): string;
}

function resolveStoragePath(storageKey: string): string {
  return join(config.storage.attachment.baseDir, storageKey);
}

export class LocalFileStorageProvider implements FileStorageProvider {
  async put(
    storageKey: string,
    buffer: Buffer,
    _meta: FileStoragePutMeta,
  ): Promise<void> {
    const absolutePath = resolveStoragePath(storageKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(resolveStoragePath(storageKey));
  }

  createReadStream(storageKey: string): ReturnType<typeof createReadStream> {
    return createReadStream(resolveStoragePath(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await unlink(resolveStoragePath(storageKey)).catch(() => undefined);
  }

  resolveAbsolutePath(storageKey: string): string {
    return resolveStoragePath(storageKey);
  }
}

let storageProvider: FileStorageProvider | null = null;

export function getFileStorageProvider(): FileStorageProvider {
  if (!storageProvider) {
    if (config.storage.attachment.storage !== "local") {
      throw new Error(
        `不支持的附件存储后端：${config.storage.attachment.storage}`,
      );
    }
    storageProvider = new LocalFileStorageProvider();
  }
  return storageProvider;
}

export function buildNoteAttachmentStorageKey(
  tenantId: string,
  attachmentId: string,
  originalFilename: string | null,
): string {
  const ext = originalFilename ? extname(originalFilename).toLowerCase() : "";
  const safeExt =
    ext && ext.length <= 8 && /^\.[a-z0-9]+$/.test(ext) ? ext : "";
  return `${tenantId}/${attachmentId}${safeExt}`;
}

export function buildEnterpriseDocumentStorageKey(
  tenantId: string,
  documentId: string,
  originalFilename: string | null,
): string {
  const ext = originalFilename ? extname(originalFilename).toLowerCase() : "";
  const safeExt =
    ext && ext.length <= 8 && /^\.[a-z0-9]+$/.test(ext) ? ext : "";
  return `enterprise-documents/${tenantId}/${documentId}${safeExt}`;
}

export function mimeTypeToExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    case "image/x-icon":
    case "image/vnd.microsoft.icon":
      return ".ico";
    default:
      return "";
  }
}

export function buildTenantBrandingStorageKey(
  tenantId: string,
  kind: "logo" | "favicon",
  mimeType: string,
): string {
  const ext = mimeTypeToExtension(mimeType) || ".bin";
  return `${tenantId}/branding/${kind}${ext}`;
}
