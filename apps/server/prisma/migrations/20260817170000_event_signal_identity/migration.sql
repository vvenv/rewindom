-- 信号身份改为「同一来源的同一篇原文」，而不是源自己给的 guid。
--
-- 起因：BBC 的 RSS guid 是 `https://…/c77ggpgrp2do#0`，文章更新后同一篇会以 `#1`
-- 再来一次。按 (connector, external_id) 去重时它们是两条信号，于是同一篇报道
-- 在事件时间线上占了两格、字字相同。canonical_url 已经剥掉了锚点与追踪参数，
-- 它才是这篇原文的真实标识。
--
-- source_name 必须进唯一键：不同来源指向同一篇原文是**合法且有价值**的，
-- 跨源印证与事件聚类正是靠 canonical_url 相等来合并的。

-- 1) 同一身份只留最早入库的那条，其余删掉
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY connector, source_name, canonical_url
      ORDER BY created_at, id
    ) AS rn
  FROM "EventSignal"
)
DELETE FROM "EventSignal"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) 时间线里指向已删信号的格子一并清掉。
--    时间线本来就会在下一次 refreshEvents 时整体重建，但那只发生在事件被触碰时；
--    先删掉可以让已经受影响的详情页立刻恢复正确。
DELETE FROM "EventTimelineEntry" e
WHERE e.signal_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "EventSignal" s WHERE s.id = e.signal_id);

-- 3) 修正被重复信号撑大的计数（同样会在下次 refresh 时重算，这里先让界面对上）
UPDATE "NewsEvent" ev
SET
  signal_count = c.signal_count,
  source_count = c.source_count
FROM (
  SELECT
    event_id,
    count(*) AS signal_count,
    count(DISTINCT source_name) AS source_count
  FROM "EventSignal"
  WHERE event_id IS NOT NULL
  GROUP BY event_id
) c
WHERE ev.id = c.event_id
  AND (ev.signal_count <> c.signal_count OR ev.source_count <> c.source_count);

-- 4) 加上唯一约束，让重复不再有机会入库（并发实例靠它静默丢弃）
CREATE UNIQUE INDEX "EventSignal_connector_source_name_canonical_url_key" ON "EventSignal"("connector", "source_name", "canonical_url");
