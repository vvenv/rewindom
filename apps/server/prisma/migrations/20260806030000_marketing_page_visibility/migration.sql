-- MarketingPage.visibility：会员专属内容门控。
-- public = 所有人可见；members = 需站点会员登录后才能看正文。

ALTER TABLE "MarketingPage"
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';
