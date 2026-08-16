import { DEFAULT_LOCALE } from "@rewindom/module-sdk";

import type {
  CreateShopCollectionBody,
  ShopCollection,
  ShopCollectionStatus,
} from "../../shared/collection.js";
import type { ShopLocalizedMap } from "../../shared/locale.js";

export interface CollectionFormValues {
  slug: string;
  status: ShopCollectionStatus;
  title: ShopLocalizedMap;
  description: ShopLocalizedMap;
  seo_title: ShopLocalizedMap;
  seo_description: ShopLocalizedMap;
  image_url: string;
  parent_id: string;
  sort_order: number;
  product_ids: string[];
}

export const COLLECTION_PARENT_NONE = "__none__";

export const INITIAL_COLLECTION_FORM: CollectionFormValues = {
  slug: "",
  status: "draft",
  title: {},
  description: {},
  seo_title: {},
  seo_description: {},
  image_url: "",
  parent_id: "",
  sort_order: 0,
  product_ids: [],
};

export function collectionToForm(
  collection: ShopCollection,
): CollectionFormValues {
  return {
    slug: collection.slug,
    status: collection.status,
    title: { ...collection.title },
    description: { ...(collection.description ?? {}) },
    seo_title: { ...(collection.seo_title ?? {}) },
    seo_description: { ...(collection.seo_description ?? {}) },
    image_url: collection.image_url ?? "",
    parent_id: collection.parent_id ?? "",
    sort_order: collection.sort_order,
    product_ids: [...collection.product_ids],
  };
}

function compactLocalized(map: ShopLocalizedMap): ShopLocalizedMap | null {
  const next = Object.fromEntries(
    Object.entries(map).filter(([, text]) => text.trim()),
  );
  return Object.keys(next).length > 0 ? next : null;
}

export function buildCollectionPayload(
  values: CollectionFormValues,
): CreateShopCollectionBody {
  return {
    slug: values.slug.trim().toLowerCase(),
    status: values.status,
    title: { ...values.title },
    description: compactLocalized(values.description),
    seo_title: compactLocalized(values.seo_title),
    seo_description: compactLocalized(values.seo_description),
    image_url: values.image_url.trim() || null,
    parent_id: values.parent_id.trim() || null,
    sort_order: values.sort_order,
    product_ids: values.product_ids,
  };
}

type Translate = (key: string) => string;

export function validateCollectionForm(
  values: CollectionFormValues,
  t: Translate,
): string | null {
  if (!values.title[DEFAULT_LOCALE]?.trim()) return t("validation.titleRequired");
  if (!values.slug.trim()) return t("validation.slugRequired");
  return null;
}
