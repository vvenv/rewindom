export const SHOP_COLLECTION_STATUSES = ["draft", "published"] as const;
export type ShopCollectionStatus = (typeof SHOP_COLLECTION_STATUSES)[number];

export function isShopCollectionStatus(
  value: unknown,
): value is ShopCollectionStatus {
  return (SHOP_COLLECTION_STATUSES as readonly unknown[]).includes(value);
}

export interface ShopCollection {
  id: string;
  tenant_id: string;
  slug: string;
  status: ShopCollectionStatus;
  title: Record<string, string>;
  description: Record<string, string> | null;
  seo_title: Record<string, string> | null;
  seo_description: Record<string, string> | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  product_ids: string[];
}

export interface ShopCollectionListItem {
  id: string;
  slug: string;
  status: ShopCollectionStatus;
  title: string;
  product_count: number;
  updated_at: string;
}

export interface CreateShopCollectionBody {
  slug: string;
  status?: ShopCollectionStatus;
  title: Record<string, string> | string;
  description?: Record<string, string> | string | null;
  seo_title?: Record<string, string> | string | null;
  seo_description?: Record<string, string> | string | null;
  image_url?: string | null;
  product_ids?: string[];
}

export interface UpdateShopCollectionBody {
  slug?: string;
  status?: ShopCollectionStatus;
  title?: Record<string, string> | string;
  description?: Record<string, string> | string | null;
  seo_title?: Record<string, string> | string | null;
  seo_description?: Record<string, string> | string | null;
  image_url?: string | null;
  product_ids?: string[];
}

export function filterProductsByCollectionSlug<
  T extends { collection_slugs: string[] },
>(products: T[], collection_slug: string | undefined): T[] {
  const slug = collection_slug?.trim();
  if (!slug) return products;
  return products.filter((product) => product.collection_slugs.includes(slug));
}
