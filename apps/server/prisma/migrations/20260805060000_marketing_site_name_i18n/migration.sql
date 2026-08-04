-- 站点名支持多语言：列改为 JSONB。
-- 存量纯字符串经 to_jsonb 仍是 JSON 字符串，单语言站点形状不变；
-- 填了第二种语言后升级为 { "__i18n": { ... } }（同页头文案）。

ALTER TABLE "MarketingSite"
  ALTER COLUMN "site_name" TYPE JSONB USING to_jsonb("site_name");
