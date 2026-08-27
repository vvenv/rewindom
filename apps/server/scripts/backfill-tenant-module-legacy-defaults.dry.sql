-- Dry-run: which tenants are missing legacy default-on tenant_modules keys?
SELECT t.slug,
       ARRAY(
         SELECT k
         FROM unnest(ARRAY[
           'tenant-marketing','mailer','billing',
           'note','todo','bookmark','contents','events',
           'site-docs','site-form','site-member','site-billing'
         ]) AS k
         WHERE s.value IS NULL OR NOT (s.value ? k)
       ) AS missing
FROM "Tenant" t
LEFT JOIN "TenantSetting" s ON s.tenant_id = t.id AND s.key = 'tenant_modules'
WHERE t.status NOT IN ('suspended', 'archived')
ORDER BY t.slug;
