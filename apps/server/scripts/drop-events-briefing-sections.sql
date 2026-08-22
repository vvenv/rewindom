-- 与 drop-events-briefing-sections.ts 同一套规则：摘掉 events.briefing
-- 以及 source.type 同名的 unsupported 占位；分栏列递归。
--
-- 生产 app 镜像没有 tsx / 源码，走 postgres：
--   docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
--     psql -U rewindom -d rewindom -v ON_ERROR_STOP=1 \
--     -f /dev/stdin < apps/server/scripts/drop-events-briefing-sections.sql

CREATE OR REPLACE FUNCTION strip_events_briefing(sections jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  elem jsonb;
  block jsonb;
  new_blocks jsonb;
  nested jsonb;
  changed boolean := false;
  i int;
  j int;
BEGIN
  IF sections IS NULL OR jsonb_typeof(sections) <> 'array' THEN
    RETURN sections;
  END IF;

  FOR i IN 0 .. jsonb_array_length(sections) - 1 LOOP
    elem := sections -> i;
    IF jsonb_typeof(elem) <> 'object' THEN
      result := result || jsonb_build_array(elem);
      CONTINUE;
    END IF;

    IF elem->>'type' = 'events.briefing'
       OR (
         elem->>'type' = 'unsupported'
         AND elem #>> '{source,type}' = 'events.briefing'
       ) THEN
      changed := true;
      CONTINUE;
    END IF;

    IF elem ? 'blocks' AND jsonb_typeof(elem->'blocks') = 'array' THEN
      new_blocks := '[]'::jsonb;
      FOR j IN 0 .. jsonb_array_length(elem->'blocks') - 1 LOOP
        block := elem->'blocks'->j;
        IF jsonb_typeof(block) = 'object' AND block ? 'sections' THEN
          nested := strip_events_briefing(block->'sections');
          IF nested IS DISTINCT FROM (block->'sections') THEN
            changed := true;
            block := jsonb_set(block, '{sections}', COALESCE(nested, '[]'::jsonb));
          END IF;
        END IF;
        new_blocks := new_blocks || jsonb_build_array(block);
      END LOOP;
      elem := jsonb_set(elem, '{blocks}', new_blocks);
    END IF;

    result := result || jsonb_build_array(elem);
  END LOOP;

  IF NOT changed THEN
    RETURN sections;
  END IF;
  RETURN result;
END;
$$;

BEGIN;

UPDATE "MarketingPage"
SET
  sections = strip_events_briefing(sections),
  sections_draft = strip_events_briefing(sections_draft)
WHERE sections IS DISTINCT FROM strip_events_briefing(sections)
   OR sections_draft IS DISTINCT FROM strip_events_briefing(sections_draft);

UPDATE "MarketingPageVersion"
SET sections = strip_events_briefing(sections)
WHERE sections IS DISTINCT FROM strip_events_briefing(sections);

COMMIT;

DROP FUNCTION strip_events_briefing(jsonb);
