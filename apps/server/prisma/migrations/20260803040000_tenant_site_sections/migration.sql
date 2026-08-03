-- AlterTable: MarketingSite theme_settings
ALTER TABLE "MarketingSite" ADD COLUMN "theme_settings" JSONB NOT NULL DEFAULT '{}';

UPDATE "MarketingSite"
SET "theme_settings" = jsonb_strip_nulls(
  jsonb_build_object(
    'logo_url', "logo_url",
    'primary_color', "primary_color",
    'font_family', 'system'
  )
);

-- AlterTable: MarketingPage sections
ALTER TABLE "MarketingPage" ADD COLUMN "sections" JSONB NOT NULL DEFAULT '[]';

-- home_blocks.hero → hero section
UPDATE "MarketingPage"
SET "sections" = "sections" || jsonb_build_array(
  jsonb_build_object(
    'id', id || '-hero',
    'type', 'hero',
    'settings', jsonb_strip_nulls(
      jsonb_build_object(
        'headline', home_blocks->'hero'->>'headline',
        'subhead', home_blocks->'hero'->>'subhead',
        'cta_label', home_blocks->'hero'->>'cta_label',
        'cta_href', home_blocks->'hero'->>'cta_href'
      )
    )
  )
)
WHERE home_blocks IS NOT NULL
  AND home_blocks ? 'hero'
  AND NULLIF(TRIM(COALESCE(home_blocks->'hero'->>'headline', '')), '') IS NOT NULL;

-- home_blocks.features → features section
UPDATE "MarketingPage"
SET "sections" = "sections" || jsonb_build_array(
  jsonb_build_object(
    'id', id || '-features',
    'type', 'features',
    'settings', jsonb_build_object(
      'items', COALESCE(home_blocks->'features', '[]'::jsonb)
    )
  )
)
WHERE home_blocks IS NOT NULL
  AND jsonb_typeof(home_blocks->'features') = 'array'
  AND jsonb_array_length(home_blocks->'features') > 0;

-- body_md → markdown section when non-empty
UPDATE "MarketingPage"
SET "sections" = "sections" || jsonb_build_array(
  jsonb_build_object(
    'id', id || '-markdown',
    'type', 'markdown',
    'settings', jsonb_build_object('body_md', body_md)
  )
)
WHERE NULLIF(TRIM(body_md), '') IS NOT NULL;

ALTER TABLE "MarketingPage" DROP COLUMN "home_blocks";
