-- Related Events：预计算的相关事件 id。
--
-- 读路径上算的话每次打开详情页都要载入候选事件的全部 centroid
-- （400 个事件 × 1536 维 float8 ≈ 4.9MB/请求），公开面 SSR 承受不起。
-- 预计算后读路径只是一次按 id 的 findMany。
--
-- 不设默认值：空数组与 NULL 都表示「还没算过」，下一轮采集会补上。

-- AlterTable
ALTER TABLE "NewsEvent" ADD COLUMN     "related_event_ids" TEXT[];

