-- 模型判出的事件类型要存得住。
--
-- kind 每轮重算：eventKindPrior ?? analysis?.kind ?? classifyEventKind，
-- 而降温扫描下 analysis 是 null——上一轮模型判出的 acquisition 会被关键词的
-- null 覆盖掉。本地库 news 那一格 1447 个事件只有 34 个有 kind，正好是
-- 关键词命中率，模型的答案一轮都没活下来。
--
-- classified_at 是「这个事件付过分类费没有」，保证窄分类调用终生一次。
-- 两列都可空且无默认值：null 的语义分别是「模型没给 / 没问过」与「没跑过」，
-- 写成默认值会让这两件事再也分不开。
ALTER TABLE "NewsEvent" ADD COLUMN     "classified_at" TIMESTAMP(3),
ADD COLUMN     "model_kind" TEXT;
