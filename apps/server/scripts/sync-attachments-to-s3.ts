/* eslint-disable no-console */
/**
 * 把本地磁盘上的附件同步到 S3 兼容 bucket（Cloudflare R2）。
 *
 * 读 `ATTACHMENT_BASE_DIR`，写 `S3_*` 配置的 bucket，与当前
 * `ATTACHMENT_STORAGE` 无关——可以先搬再把运行时切到 r2。
 *
 * 用法：
 *   pnpm --filter server exec tsx scripts/sync-attachments-to-s3.ts --dry-run
 *   pnpm --filter server exec tsx scripts/sync-attachments-to-s3.ts
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

import { S3FileStorageProvider } from "@rewindom/server-kernel/infra/file-storage/s3-file-storage.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { extensionToMimeType } from "@rewindom/server-kernel/lib/mime.js";

async function listRelativeFiles(root: string): Promise<string[]> {
  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) {
    return [];
  }

  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(relative(root, full).split(sep).join("/"));
      }
    }
  }

  await walk(root);
  return out.sort();
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const baseDir = config.storage.attachment.baseDir;
  const keys = await listRelativeFiles(baseDir);

  console.log(
    `[sync-attachments-to-s3] baseDir=${baseDir} files=${keys.length} dry_run=${dryRun}`,
  );

  if (keys.length === 0) {
    return;
  }

  const sample = keys.slice(0, 10);
  console.log("[sync-attachments-to-s3] sample:", sample);

  if (dryRun) {
    return;
  }

  const s3 = config.storage.attachment.s3;
  const kind: "s3" | "r2" =
    config.storage.attachment.storage === "r2" ||
    s3.endpoint.includes("r2.cloudflarestorage.com")
      ? "r2"
      : "s3";
  const storage = S3FileStorageProvider.fromConfig(s3, kind);

  let uploaded = 0;
  for (const key of keys) {
    const buffer = await readFile(join(baseDir, key));
    const mime_type = extensionToMimeType(extname(key));
    await storage.put(key, buffer, { mime_type, visibility: "public" });
    uploaded += 1;
    if (uploaded % 50 === 0 || uploaded === keys.length) {
      console.log(
        `[sync-attachments-to-s3] uploaded=${uploaded}/${keys.length}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
