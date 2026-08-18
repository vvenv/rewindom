-- topic 从「采集源的属性」变成「事件内容的属性」。
--
-- 指纹不再带 topic 前缀：带前缀时同一件事被不同主题的源报道会算出两个指纹
-- （`ai:foo` 与 `tech:foo`），而那正是最该合并的一对——跨源印证。
--
-- 存量数据要一次性接住（AGENTS.md「变更与兼容性」）：剥掉前缀后会撞唯一键，
-- 撞键的两条**本来就该是同一个事件**，所以合并而不是丢弃。

-- 1. 新增「主题被人工指定过」标记。topic 从此每轮重算，不锁住的话
--    工作台改过的主题会被下一轮采集覆盖。
ALTER TABLE "NewsEvent" ADD COLUMN "manual_topic" BOOLEAN NOT NULL DEFAULT false;

-- 2. 算出剥掉 topic 前缀后的指纹，并选出每组的保留者（最早出现的那条）
-- 临时表按会话作用域，迁移结束即失效；不用 ON COMMIT DROP，
-- 那要求整个文件确实跑在一个事务里，而这一点不该由迁移脚本假设。
CREATE TEMP TABLE events_fp_merge AS
WITH stripped AS (
  SELECT
    id,
    tenant_id,
    substring(fingerprint FROM position(':' IN fingerprint) + 1) AS new_fp,
    first_seen_at,
    created_at
  FROM "NewsEvent"
  WHERE position(':' IN fingerprint) > 0
),
keeper AS (
  SELECT DISTINCT ON (tenant_id, new_fp)
    tenant_id, new_fp, id AS keeper_id
  FROM stripped
  ORDER BY tenant_id, new_fp, first_seen_at ASC, created_at ASC, id ASC
)
SELECT s.id AS loser_id, k.keeper_id, s.tenant_id, s.new_fp
FROM stripped s
JOIN keeper k ON k.tenant_id = s.tenant_id AND k.new_fp = s.new_fp;

-- 3. 信号改挂到保留者上。EventSignal 没有 (event_id, …) 唯一键，直接改指向即可。
UPDATE "EventSignal" s
SET event_id = m.keeper_id
FROM events_fp_merge m
WHERE s.event_id = m.loser_id AND m.loser_id <> m.keeper_id;

-- 4. 被合并掉那条的时间线整条丢弃——时间线由 refreshEvents 按信号重建，
--    搬过去只会撞 (event_id, signal_id) 唯一键。
DELETE FROM "EventTimelineEntry" e
USING events_fp_merge m
WHERE e.event_id = m.loser_id AND m.loser_id <> m.keeper_id;

-- 5. 关注迁到保留者上；同一用户已经关注过保留者时丢弃重复的那条
--    （唯一键 tenant_id + user_id + event_id）。
DELETE FROM "EventFollow" f
USING events_fp_merge m
WHERE f.event_id = m.loser_id
  AND m.loser_id <> m.keeper_id
  AND EXISTS (
    SELECT 1 FROM "EventFollow" k
    WHERE k.tenant_id = f.tenant_id
      AND k.user_id = f.user_id
      AND k.event_id = m.keeper_id
  );

UPDATE "EventFollow" f
SET event_id = m.keeper_id
FROM events_fp_merge m
WHERE f.event_id = m.loser_id AND m.loser_id <> m.keeper_id;

-- 6. 删掉被合并掉的事件
DELETE FROM "NewsEvent" e
USING events_fp_merge m
WHERE e.id = m.loser_id AND m.loser_id <> m.keeper_id;

-- 7. 保留者换成不带前缀的指纹
UPDATE "NewsEvent" e
SET fingerprint = m.new_fp
FROM events_fp_merge m
WHERE e.id = m.keeper_id;

-- 8. 保留者的冗余计数按合并后的信号集合重算。
--    热度与增速是时间窗口量，交给下一轮 refreshEvents；
--    analyzed_at 置空强制重写摘要与时间线——它们现在覆盖的是更多来源。
UPDATE "NewsEvent" e
SET
  signal_count = agg.signal_count,
  source_count = agg.source_count,
  source_names = agg.source_names,
  first_seen_at = agg.first_seen_at,
  last_activity_at = agg.last_activity_at,
  analyzed_at = NULL
FROM (
  SELECT
    s.event_id,
    count(*)::int AS signal_count,
    count(DISTINCT s.source_name)::int AS source_count,
    (array_agg(DISTINCT s.source_name))[1:8] AS source_names,
    min(s.published_at) AS first_seen_at,
    max(s.published_at) AS last_activity_at
  FROM "EventSignal" s
  WHERE s.event_id IS NOT NULL
  GROUP BY s.event_id
) agg
WHERE e.id = agg.event_id
  AND EXISTS (
    SELECT 1 FROM events_fp_merge m
    WHERE m.keeper_id = e.id AND m.loser_id <> m.keeper_id
  );
