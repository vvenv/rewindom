-- 站点首页：访客访问 `/` 时渲染的逻辑路径。默认仍是 home 模板。

ALTER TABLE "MarketingSite" ADD COLUMN "home_path" TEXT NOT NULL DEFAULT '/';
