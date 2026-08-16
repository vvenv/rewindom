import { registerSettingSelectOptions } from "@rewindom/builtin/marketing/client/setting-select-options.js";

import {
  collectionSelectOptions,
  type ShopCollectionCardView,
} from "../shared/collection.js";
import { SHOP_COLLECTION_SELECT_OPTIONS } from "../shared/collection-list-section.js";
import { SHOP_CONTEXT_KEY } from "../shared/shop-section-context.js";

function isCollectionCard(value: unknown): value is ShopCollectionCardView {
  if (!value || typeof value !== "object") return false;
  const row = value as ShopCollectionCardView;
  return typeof row.slug === "string" && typeof row.title === "string";
}

function collectionsFromContributed(
  contributed: Readonly<Record<string, unknown>> | undefined,
): ShopCollectionCardView[] {
  const shop = contributed?.[SHOP_CONTEXT_KEY];
  if (!shop || typeof shop !== "object") return [];
  const collections = (shop as { collections?: unknown }).collections;
  if (!Array.isArray(collections)) return [];
  return collections.filter(isCollectionCard);
}

export function registerShopCollectionSelectOptions(): void {
  registerSettingSelectOptions({
    id: SHOP_COLLECTION_SELECT_OPTIONS,
    options: (contributed) =>
      collectionSelectOptions(collectionsFromContributed(contributed)),
  });
}
