import { isShopLocalizedMap, type ShopLocalizedMap } from "./locale.js";

export const SHOP_PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ShopProductStatus = (typeof SHOP_PRODUCT_STATUSES)[number];

export function isShopProductStatus(value: unknown): value is ShopProductStatus {
  return (SHOP_PRODUCT_STATUSES as readonly unknown[]).includes(value);
}

export const SHOP_INVENTORY_POLICIES = ["deny", "continue"] as const;
export type ShopInventoryPolicy = (typeof SHOP_INVENTORY_POLICIES)[number];

export function isShopInventoryPolicy(
  value: unknown,
): value is ShopInventoryPolicy {
  return (SHOP_INVENTORY_POLICIES as readonly unknown[]).includes(value);
}

export const SHOP_MAX_IMAGES = 12;
export const SHOP_MAX_TAGS = 32;
export const SHOP_MAX_TAG_LENGTH = 40;
export const SHOP_MAX_NOTE_LENGTH = 500;
export const SHOP_MAX_ORG_LENGTH = 80;
export const SHOP_MAX_BARCODE_LENGTH = 64;

export interface ShopProductImage {
  id: string;
  url: string;
  alt: ShopLocalizedMap;
}

export function isShopImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function readShopImages(value: unknown): ShopProductImage[] {
  if (!Array.isArray(value)) return [];
  const images: ShopProductImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url.trim() : "";
    if (!isShopImageUrl(url)) continue;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : crypto.randomUUID();
    const alt = isShopLocalizedMap(record.alt) ? { ...record.alt } : {};
    images.push({ id, url, alt });
  }
  return images.slice(0, SHOP_MAX_IMAGES);
}

export function featuredImage(
  images: ShopProductImage[],
): ShopProductImage | null {
  return images[0] ?? null;
}

export function readShopTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,，]/u)
      : [];
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const tag = item.trim().toLowerCase();
    if (!tag || tag.length > SHOP_MAX_TAG_LENGTH || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= SHOP_MAX_TAGS) break;
  }
  return tags;
}

export function readOrgField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, SHOP_MAX_ORG_LENGTH);
}

export function readBarcode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > SHOP_MAX_BARCODE_LENGTH) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(trimmed)) return null;
  return trimmed;
}

export function readInventoryPolicy(value: unknown): ShopInventoryPolicy {
  return isShopInventoryPolicy(value) ? value : "deny";
}

export function readOptionalCents(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cents = Math.trunc(value);
  return cents > 0 ? cents : null;
}

export function isVariantAvailable(
  variant: {
    stock_qty: number;
    track_inventory: boolean;
    inventory_policy: ShopInventoryPolicy;
  },
  quantity = 1,
): boolean {
  if (!variant.track_inventory) return true;
  if (variant.inventory_policy === "continue") return true;
  return variant.stock_qty >= quantity;
}

export function cartRequiresShipping(
  items: Array<{ requires_shipping: boolean }>,
): boolean {
  return items.some((item) => item.requires_shipping);
}

export function cartHasTaxableItem(items: Array<{ taxable: boolean }>): boolean {
  return items.some((item) => item.taxable);
}

export function readOrderNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, SHOP_MAX_NOTE_LENGTH);
}
