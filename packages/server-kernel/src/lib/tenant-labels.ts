import { prisma } from "./prisma.js";

export interface TenantLabel {
  name: string;
  slug: string;
}

/**
 * Batch-load tenant name/slug for platform list enrichment (no Prisma relation required).
 */
export async function loadTenantLabelsByIds(
  ids: readonly string[],
): Promise<Map<string, TenantLabel>> {
  const unique = [...new Set(ids.filter((id) => id.trim().length > 0))];
  if (unique.length === 0) return new Map();

  const rows = await prisma.tenant.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, slug: true },
  });

  return new Map(rows.map((row) => [row.id, { name: row.name, slug: row.slug }]));
}

/**
 * Batch-load tenant labels keyed by slug (denormalized log tables).
 */
export async function loadTenantLabelsBySlugs(
  slugs: readonly string[],
): Promise<Map<string, TenantLabel>> {
  const unique = [
    ...new Set(
      slugs
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0),
    ),
  ];
  if (unique.length === 0) return new Map();

  const rows = await prisma.tenant.findMany({
    where: { slug: { in: unique } },
    select: { name: true, slug: true },
  });

  return new Map(rows.map((row) => [row.slug, { name: row.name, slug: row.slug }]));
}

export async function resolveTenantIdBySlug(
  slug: string | undefined,
): Promise<string | undefined> {
  const trimmed = slug?.trim();
  if (!trimmed) return undefined;
  const row = await prisma.tenant.findUnique({
    where: { slug: trimmed },
    select: { id: true },
  });
  return row?.id;
}
