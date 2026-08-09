-- bookmark 模块补齐：派生列 host、审计列 updated_by、默认排序用的复合索引。
-- AlterTable
ALTER TABLE "Bookmark" ADD COLUMN     "host" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updated_by" TEXT;

-- 20260808180000 改了表名与索引名，主键约束名漏改，这里补上。
ALTER TABLE "Bookmark" RENAME CONSTRAINT "ExternalBookmark_pkey" TO "Bookmark_pkey";

-- 存量行回填 host：剥掉 scheme / path / query / 端口 / www. 前缀。
-- 与 server/bookmark.util.ts 的 extractBookmarkHost 口径一致。
UPDATE "Bookmark"
SET "host" = lower(
  regexp_replace(
    regexp_replace(
      split_part(
        split_part(
          regexp_replace("url", '^[a-zA-Z][a-zA-Z0-9+.-]*://', ''),
          '/', 1
        ),
        '?', 1
      ),
      '^www\.', ''
    ),
    ':[0-9]+$', ''
  )
)
WHERE "host" = '';

-- CreateIndex
CREATE INDEX "Bookmark_tenant_id_updated_at_idx" ON "Bookmark"("tenant_id", "updated_at");
