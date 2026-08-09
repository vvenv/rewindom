-- 标语与站名同口径：可存纯字符串或 { __i18n: { … } }
ALTER TABLE "MarketingSite" ALTER COLUMN "tagline" DROP DEFAULT;
ALTER TABLE "MarketingSite" ALTER COLUMN "tagline" TYPE JSONB USING to_jsonb("tagline");
ALTER TABLE "MarketingSite" ALTER COLUMN "tagline" SET DEFAULT '""'::jsonb;
