-- 原文配图地址。存 URL 不存图：详情页热链出版方自己的文件，他们换掉或删掉
-- 就等于撤回。落盘副本会让我们变成分发方，那是另一回事。
-- 见 modules/events/features/event-article-image.spec.yaml
ALTER TABLE "EventSignal" ADD COLUMN     "image_url" TEXT;

-- 模板图去噪要按 (来源, 图) 分组计数；代理路由要按图反查「这条我们采过没有」
CREATE INDEX "EventSignal_tenant_id_source_name_image_url_idx" ON "EventSignal"("tenant_id", "source_name", "image_url");
