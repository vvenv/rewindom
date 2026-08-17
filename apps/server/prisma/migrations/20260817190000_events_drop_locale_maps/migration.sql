-- 移除事件的机器翻译与数据多语言。
--
-- 免费机器翻译（MyMemory）的成品质量撑不起产品面：专有名词被译坏
--（"Direct File" → 「直接文件」这类），而它又是没有 LLM key 时唯一的译文来源。
-- 与其留一套「有时对、有时明显错」的译文，不如只显示来源原文——
-- 原文至少永远是准确的，也与「来源是事件的证据」这条产品口径一致。
--
-- title / summary 两列本来就是原文，保持不变；这里只删语言表与原文语种标记。
-- LLM 分析器同步回到单语输出（提示词改为「用来源标题的主要语种，不要翻译」）。

ALTER TABLE "NewsEvent"
  DROP COLUMN "origin_locale",
  DROP COLUMN "title_i18n",
  DROP COLUMN "summary_i18n";

ALTER TABLE "EventTimelineEntry" DROP COLUMN "label_text_i18n";
