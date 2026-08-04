-- MarketingSite：logo_url / primary_color 收敛进 theme_settings，删掉重复的列。
--
-- 20260803040000 已经把列灌进过 theme_settings，但代码一直双写；这里先补齐
-- 「列上有值、JSON 里却缺键」的行（双写之间写入的数据），再删列。
-- JSON 已有该键时不覆盖——theme_settings 才是真相源。

UPDATE "MarketingSite"
SET "theme_settings" =
  "theme_settings" || jsonb_build_object('logo_url', "logo_url")
WHERE "logo_url" IS NOT NULL
  AND NOT ("theme_settings" ? 'logo_url');

UPDATE "MarketingSite"
SET "theme_settings" =
  "theme_settings" || jsonb_build_object('primary_color', "primary_color")
WHERE "primary_color" IS NOT NULL
  AND NOT ("theme_settings" ? 'primary_color');

ALTER TABLE "MarketingSite" DROP COLUMN "logo_url";
ALTER TABLE "MarketingSite" DROP COLUMN "primary_color";
