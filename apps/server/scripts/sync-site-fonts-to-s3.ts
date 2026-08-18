/* eslint-disable no-console */
/**
 * 把官网精选 webfont 切片同步到 S3 兼容 bucket（Cloudflare R2）。
 *
 * 读 `apps/client/public/assets/site-fonts/`（assemble:site-fonts 的产物），
 * 写入 `platform/site-fonts/{file}`。与当前 `ATTACHMENT_STORAGE` 无关——
 * 可以先搬再让 SSR 用 `S3_PUBLIC_BASE_URL` 改写 `@font-face`。
 *
 * 用法：
 *   pnpm --filter @rewindom/builtin assemble:site-fonts
 *   pnpm --filter server exec tsx scripts/sync-site-fonts-to-s3.ts --dry-run
 *   pnpm --filter server exec tsx scripts/sync-site-fonts-to-s3.ts
 *
 * bucket / 自定义域必须对 `font/woff2` 开 CORS（`@font-face` 跨源），
 * 见 `docs/design/file-storage.md`。
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { THEME_FONT_STORAGE_PREFIX } from "@rewindom/builtin/marketing/shared/theme-fonts.js";
import { S3FileStorageProvider } from "@rewindom/server-kernel/infra/file-storage/s3-file-storage.js";
import { config } from "@rewindom/server-kernel/lib/config.js";

const FONT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../apps/client/public/assets/site-fonts",
);

async function listWoff2(dir: string): Promise<string[]> {
  const dirStat = await stat(dir).catch(() => null);
  if (!dirStat?.isDirectory()) {
    return [];
  }
  const names = await readdir(dir);
  return names.filter((name) => name.endsWith(".woff2")).sort();
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const files = await listWoff2(FONT_DIR);
  const s3 = config.storage.attachment.s3;

  console.log(
    `[sync-site-fonts-to-s3] dir=${FONT_DIR} files=${files.length} dry_run=${dryRun}`,
  );

  if (files.length === 0) {
    console.log(
      "[sync-site-fonts-to-s3] no woff2 — run `pnpm --filter @rewindom/builtin assemble:site-fonts` first",
    );
    return;
  }

  if (!s3.bucket || !s3.accessKeyId || !s3.secretAccessKey) {
    throw new Error(
      "S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY 未配置",
    );
  }

  console.log(
    `[sync-site-fonts-to-s3] prefix=${THEME_FONT_STORAGE_PREFIX} sample=${files.slice(0, 5).join(",")}`,
  );

  if (dryRun) {
    return;
  }

  const kind: "s3" | "r2" =
    config.storage.attachment.storage === "r2" ||
    s3.endpoint.includes("r2.cloudflarestorage.com")
      ? "r2"
      : "s3";
  const storage = S3FileStorageProvider.fromConfig(s3, kind);

  let uploaded = 0;
  for (const file of files) {
    const buffer = await readFile(join(FONT_DIR, file));
    await storage.put(`${THEME_FONT_STORAGE_PREFIX}/${file}`, buffer, {
      mime_type: "font/woff2",
      visibility: "public",
    });
    uploaded += 1;
  }
  console.log(`[sync-site-fonts-to-s3] uploaded=${uploaded}/${files.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
