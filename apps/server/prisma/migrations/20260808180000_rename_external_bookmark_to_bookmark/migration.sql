-- 模块 example-external → bookmark 改名遗漏的表名同步。
-- schema model 已从 ExternalBookmark 改为 Bookmark（无 @@map，表名随 model 名），
-- 但建表迁移 20260808052215_example_external 仍建的是 ExternalBookmark。
-- 这里增量 rename，使表名与 model 一致；数据保留。
ALTER TABLE "ExternalBookmark" RENAME TO "Bookmark";

ALTER INDEX "ExternalBookmark_tenant_id_idx" RENAME TO "Bookmark_tenant_id_idx";
