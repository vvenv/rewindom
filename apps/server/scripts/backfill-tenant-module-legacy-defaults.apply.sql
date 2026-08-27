-- Apply: freeze missing legacy default-on keys as explicit true.
-- Does not overwrite existing true/false.

INSERT INTO "TenantSetting" (tenant_id, key, value, secret, updated_at)
SELECT t.id, 'tenant_modules', '{}'::jsonb, NULL, NOW()
FROM "Tenant" t
WHERE t.status NOT IN ('suspended', 'archived')
  AND NOT EXISTS (
    SELECT 1 FROM "TenantSetting" s
    WHERE s.tenant_id = t.id AND s.key = 'tenant_modules'
  );

UPDATE "TenantSetting" t
SET value = t.value || (
      SELECT jsonb_object_agg(k, 'true'::jsonb)
      FROM unnest(ARRAY[
        'tenant-marketing','mailer','billing',
        'note','todo','bookmark','contents','events',
        'site-docs','site-form','site-member','site-billing'
      ]) AS k
      WHERE NOT (t.value ? k)
    ),
    updated_at = NOW()
WHERE t.key = 'tenant_modules'
  AND t.tenant_id IN (
    SELECT id FROM "Tenant" WHERE status NOT IN ('suspended', 'archived')
  )
  AND EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
      'tenant-marketing','mailer','billing',
      'note','todo','bookmark','contents','events',
      'site-docs','site-form','site-member','site-billing'
    ]) AS k
    WHERE NOT (t.value ? k)
  );
