-- ErrorLog.request_body: TEXT -> JSONB
--
-- 手写而非 `migrate dev` 生成：Prisma 的自动 diff 是 `DROP COLUMN` + `ADD COLUMN`，会丢历史数据。
-- 历史值由 error-handler 的 `JSON.stringify(request.body)` 写入，绝大多数是合法 JSON。
-- 用 pg_input_is_valid（PostgreSQL 16+）逐行判定：
--   合法 JSON -> 直接 cast；非法文本 -> to_jsonb() 包成 JSON 字符串，保留原文而不是丢弃。
--
-- 注意：ALTER COLUMN TYPE 整表重写并持有 ACCESS EXCLUSIVE 锁。ErrorLog 已经很大时，
-- 先跑 `DELETE FROM "ErrorLog" WHERE created_at < now() - interval '30 days'` 缩表，或选低峰执行。
ALTER TABLE "ErrorLog"
  ALTER COLUMN "request_body" TYPE JSONB
  USING CASE
    WHEN "request_body" IS NULL THEN NULL
    WHEN pg_input_is_valid("request_body", 'jsonb') THEN "request_body"::jsonb
    ELSE to_jsonb("request_body")
  END;

-- CreateIndex
-- jsonb_path_ops：只支持 @> / @? / @@，索引体积约为默认 jsonb_ops 的 1/3。
-- 日志表持续增长，优先选小的；需要键存在查询（? / ?| / ?&）时改回 jsonb_ops。
CREATE INDEX "ErrorLog_request_body_idx" ON "ErrorLog" USING GIN ("request_body" jsonb_path_ops);
