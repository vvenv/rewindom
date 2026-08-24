-- 一手来源的出版方实体。
--
-- 归位与累计档案要求事件上有主实体，而实体抽取刻意保守（覆盖率约三分之一），
-- 于是 release / status / official 这批最该有实体的事件反而最缺。
-- 它们的实体不用猜：`Cloudflare Status` 的事件就是关于 Cloudflare 的。

-- AlterTable
ALTER TABLE "EventEntityLink" ADD COLUMN     "is_publisher" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventFeed" ADD COLUMN     "publisher_entity_kind" TEXT,
ADD COLUMN     "publisher_entity_name" TEXT;
