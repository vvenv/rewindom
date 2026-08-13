import {
  ConflictError,
  NotFoundError,
  ValidationError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
} from "@rewindom/module-sdk/server";
import type { AppLocale } from "@rewindom/module-sdk";

import {
  isShopProductStatus,
  readOptionValues,
  readShopOptions,
  SHOP_MAX_OPTIONS,
  SHOP_MAX_OPTION_VALUES,
  type CreateShopProductBody,
  type ShopProduct,
  type ShopProductListItem,
  type ShopProductOption,
  type ShopVariant,
  type UpdateShopProductBody,
  type UpdateShopVariantBody,
  type ShopVariantInput,
} from "../../shared/index.js";
import {
  asPositiveInt,
  displayTitle,
  normalizeCountry,
  normalizeCurrency,
  normalizeHsCode,
  parseLocalizedInput,
  requireLocalizedInput,
  SKU_RE,
  SLUG_RE,
} from "../lib/format.js";

type ProductRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.shopProduct.findFirst>>
>;
type VariantRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.shopVariant.findFirst>>
>;

const PRODUCT_SORTABLE = new Set(["slug", "status", "updated_at", "created_at"]);

function asJson(
  value: Record<string, string> | null,
): Record<string, string> | undefined {
  return value ?? undefined;
}

function toJson(value: unknown): object {
  return JSON.parse(JSON.stringify(value)) as object;
}

function toVariant(record: VariantRecord): ShopVariant {
  return {
    id: record.id,
    product_id: record.product_id,
    sku: record.sku,
    title:
      record.title && typeof record.title === "object" && !Array.isArray(record.title)
        ? (record.title as Record<string, string>)
        : null,
    option_values: readOptionValues(record.option_values),
    price_cents: record.price_cents,
    currency: record.currency,
    stock_qty: record.stock_qty,
    weight_g: record.weight_g,
    hs_code: record.hs_code,
    origin_country: record.origin_country,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

function toProduct(
  record: ProductRecord & { variants: VariantRecord[] },
): ShopProduct {
  const title =
    record.title && typeof record.title === "object" && !Array.isArray(record.title)
      ? (record.title as Record<string, string>)
      : {};
  const description =
    record.description &&
    typeof record.description === "object" &&
    !Array.isArray(record.description)
      ? (record.description as Record<string, string>)
      : null;
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    slug: record.slug,
    status: isShopProductStatus(record.status) ? record.status : "draft",
    title,
    description,
    options: readShopOptions(record.options),
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
    variants: record.variants.map(toVariant),
  };
}

function validateSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!SLUG_RE.test(normalized)) {
    throw new ValidationError("shop.slug_invalid");
  }
  return normalized;
}

function validateSku(sku: string): string {
  const normalized = sku.trim();
  if (!SKU_RE.test(normalized)) {
    throw new ValidationError("shop.sku_invalid");
  }
  return normalized;
}

function parseVariantInput(input: ShopVariantInput): {
  sku: string;
  title: Record<string, string> | null;
  option_values: Record<string, string>;
  price_cents: number;
  currency: string;
  stock_qty: number;
  weight_g: number;
  hs_code: string | null;
  origin_country: string | null;
} {
  const sku = validateSku(input.sku);
  const price_cents = asPositiveInt(input.price_cents);
  if (price_cents < 1) {
    throw new ValidationError("shop.price_invalid");
  }
  const origin = input.origin_country
    ? normalizeCountry(input.origin_country)
    : null;
  if (input.origin_country && !origin) {
    throw new ValidationError("shop.country_invalid");
  }
  const hs = input.hs_code ? normalizeHsCode(input.hs_code) : null;
  if (input.hs_code && !hs) {
    throw new ValidationError("shop.hs_code_invalid");
  }
  return {
    sku,
    title: parseLocalizedInput(input.title ?? null, "zh-CN"),
    option_values: readOptionValues(input.option_values),
    price_cents,
    currency: normalizeCurrency(input.currency),
    stock_qty: asPositiveInt(input.stock_qty),
    weight_g: asPositiveInt(input.weight_g),
    hs_code: hs,
    origin_country: origin,
  };
}

function parseProductOptions(raw: unknown): ShopProductOption[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new ValidationError("shop.options_invalid");
  }
  if (raw.length > SHOP_MAX_OPTIONS) {
    throw new ValidationError("shop.options_limit");
  }
  const options: ShopProductOption[] = [];
  const optionIds = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ValidationError("shop.options_invalid");
    }
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : crypto.randomUUID();
    if (optionIds.has(id)) throw new ValidationError("shop.options_invalid");
    optionIds.add(id);
    const name = parseLocalizedInput(record.name, "zh-CN");
    if (!name) throw new ValidationError("shop.option_name_required");
    if (!Array.isArray(record.values) || record.values.length === 0) {
      throw new ValidationError("shop.option_values_required");
    }
    if (record.values.length > SHOP_MAX_OPTION_VALUES) {
      throw new ValidationError("shop.option_values_limit");
    }
    const valueIds = new Set<string>();
    const values = record.values.map((valueRaw) => {
      if (!valueRaw || typeof valueRaw !== "object" || Array.isArray(valueRaw)) {
        throw new ValidationError("shop.options_invalid");
      }
      const value = valueRaw as Record<string, unknown>;
      const valueId =
        typeof value.id === "string" && value.id.trim()
          ? value.id.trim()
          : crypto.randomUUID();
      if (valueIds.has(valueId)) throw new ValidationError("shop.options_invalid");
      valueIds.add(valueId);
      const valueName = parseLocalizedInput(value.name, "zh-CN");
      if (!valueName) throw new ValidationError("shop.option_name_required");
      return { id: valueId, name: valueName };
    });
    options.push({ id, name, values });
  }
  return options;
}

function assertVariantMatchesOptions(
  options: ShopProductOption[],
  option_values: Record<string, string>,
): void {
  if (options.length === 0) {
    if (Object.keys(option_values).length > 0) {
      throw new ValidationError("shop.variant_options_mismatch");
    }
    return;
  }
  if (Object.keys(option_values).length !== options.length) {
    throw new ValidationError("shop.variant_options_mismatch");
  }
  for (const option of options) {
    const valueId = option_values[option.id];
    if (!option.values.some((value) => value.id === valueId)) {
      throw new ValidationError("shop.variant_options_mismatch");
    }
  }
}

function parseVariantsInput(
  raw: ShopVariantInput[] | undefined,
  options: ShopProductOption[],
): Array<ReturnType<typeof parseVariantInput> & { id?: string }> {
  if (!raw || raw.length === 0) {
    throw new ValidationError("shop.variant_required");
  }
  const parsed = raw.map((item) => ({
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : undefined,
    ...parseVariantInput(item),
  }));
  const skus = new Set<string>();
  const combos = new Set<string>();
  for (const variant of parsed) {
    assertVariantMatchesOptions(options, variant.option_values);
    if (skus.has(variant.sku)) throw new ConflictError("shop.sku_taken");
    skus.add(variant.sku);
    const combo = JSON.stringify(
      Object.keys(variant.option_values)
        .sort()
        .map((key) => [key, variant.option_values[key]]),
    );
    if (combos.has(combo)) throw new ValidationError("shop.variant_options_mismatch");
    combos.add(combo);
  }
  return parsed;
}

export interface ListProductsParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  status?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  locale: AppLocale;
}

export async function listProducts(
  params: ListProductsParams,
): Promise<{
  items: ShopProductListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}> {
  const skip = (params.page - 1) * params.page_size;
  const field = resolveSortField(params.sort_by, PRODUCT_SORTABLE, "updated_at");
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = withTenantScope(params.tenant_id, {
    ...(params.status && isShopProductStatus(params.status)
      ? { status: params.status }
      : {}),
    ...(params.q?.trim()
      ? {
          OR: [
            { slug: { contains: params.q.trim(), mode: "insensitive" as const } },
            {
              variants: {
                some: {
                  sku: { contains: params.q.trim(), mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
  });

  const [records, total] = await Promise.all([
    prisma.shopProduct.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: params.page_size,
      include: { variants: true },
    }),
    prisma.shopProduct.count({ where }),
  ]);

  return {
    items: records.map((record) => {
      const prices = record.variants.map((item) => item.price_cents);
      const first = record.variants[0];
      return {
        id: record.id,
        slug: record.slug,
        status: isShopProductStatus(record.status) ? record.status : "draft",
        title: displayTitle(record.title, params.locale, record.slug),
        sku_count: record.variants.length,
        min_price_cents: prices.length ? Math.min(...prices) : null,
        currency: first?.currency ?? null,
        total_stock: record.variants.reduce((sum, item) => sum + item.stock_qty, 0),
        updated_at: record.updated_at.toISOString(),
      };
    }),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function getProduct(
  tenant_id: string,
  product_id: string,
): Promise<ShopProduct> {
  const record = await prisma.shopProduct.findFirst({
    where: withTenantScope(tenant_id, { id: product_id }),
    include: { variants: { orderBy: { created_at: "asc" } } },
  });
  if (!record) throw new NotFoundError("shop.product_not_found");
  return toProduct(record);
}

export async function getPublishedProductBySlug(
  tenant_id: string,
  slug: string,
): Promise<ShopProduct> {
  const record = await prisma.shopProduct.findFirst({
    where: withTenantScope(tenant_id, { slug, status: "published" }),
    include: { variants: { orderBy: { created_at: "asc" } } },
  });
  if (!record) throw new NotFoundError("shop.product_not_found");
  return toProduct(record);
}

export async function listPublishedProducts(
  tenant_id: string,
): Promise<ShopProduct[]> {
  const records = await prisma.shopProduct.findMany({
    where: withTenantScope(tenant_id, { status: "published" }),
    orderBy: { updated_at: "desc" },
    include: { variants: { orderBy: { created_at: "asc" } } },
  });
  return records.map(toProduct);
}

export async function createProduct(params: {
  tenant_id: string;
  user_id: string;
  locale: AppLocale;
  body: CreateShopProductBody;
}): Promise<ShopProduct> {
  const slug = validateSlug(params.body.slug);
  const title = requireLocalizedInput(params.body.title, params.locale);
  if (!Object.values(title).some((text) => text.trim())) {
    throw new ValidationError("shop.title_required");
  }
  const description = parseLocalizedInput(
    params.body.description ?? null,
    params.locale,
  );
  const options = parseProductOptions(params.body.options);
  const variants = parseVariantsInput(params.body.variants, options);
  const status = isShopProductStatus(params.body.status)
    ? params.body.status
    : "draft";

  const existingSlug = await prisma.shopProduct.findFirst({
    where: withTenantScope(params.tenant_id, { slug }),
    select: { id: true },
  });
  if (existingSlug) throw new ConflictError("shop.slug_taken");

  const existingSku = await prisma.shopVariant.findFirst({
    where: withTenantScope(params.tenant_id, {
      sku: { in: variants.map((item) => item.sku) },
    }),
    select: { id: true },
  });
  if (existingSku) throw new ConflictError("shop.sku_taken");

  const record = await prisma.shopProduct.create({
    data: {
      tenant_id: params.tenant_id,
      slug,
      status,
      title,
      description: description ?? undefined,
      options: toJson(options),
      created_by: params.user_id,
      variants: {
        create: variants.map((variant) => ({
          tenant_id: params.tenant_id,
          sku: variant.sku,
          title: asJson(variant.title),
          option_values: toJson(variant.option_values),
          price_cents: variant.price_cents,
          currency: variant.currency,
          stock_qty: variant.stock_qty,
          weight_g: variant.weight_g,
          hs_code: variant.hs_code,
          origin_country: variant.origin_country,
        })),
      },
    },
    include: { variants: true },
  });
  return toProduct(record);
}

export async function updateProduct(params: {
  tenant_id: string;
  user_id: string;
  product_id: string;
  locale: AppLocale;
  body: UpdateShopProductBody;
}): Promise<ShopProduct> {
  const current = await getProduct(params.tenant_id, params.product_id);
  const data: {
    slug?: string;
    status?: string;
    title?: Record<string, string>;
    description?: Record<string, string>;
    options?: object;
    updated_by: string;
  } = { updated_by: params.user_id };

  if (params.body.slug !== undefined) {
    const slug = validateSlug(params.body.slug);
    const clash = await prisma.shopProduct.findFirst({
      where: withTenantScope(params.tenant_id, {
        slug,
        NOT: { id: params.product_id },
      }),
      select: { id: true },
    });
    if (clash) throw new ConflictError("shop.slug_taken");
    data.slug = slug;
  }
  if (params.body.status !== undefined) {
    if (!isShopProductStatus(params.body.status)) {
      throw new ValidationError("shop.status_invalid");
    }
    data.status = params.body.status;
  }
  if (params.body.title !== undefined) {
    const title = requireLocalizedInput(params.body.title, params.locale);
    if (!Object.values(title).some((text) => text.trim())) {
      throw new ValidationError("shop.title_required");
    }
    data.title = title;
  }
  if (params.body.description !== undefined) {
    data.description = parseLocalizedInput(
      params.body.description,
      params.locale,
    ) ?? {};
  }
  if (params.body.options !== undefined) {
    if (params.body.variants === undefined) {
      throw new ValidationError("shop.variant_required");
    }
    data.options = toJson(parseProductOptions(params.body.options));
  }

  const options =
    params.body.options !== undefined
      ? parseProductOptions(params.body.options)
      : current.options;
  if (params.body.variants !== undefined) {
    await syncProductVariants({
      tenant_id: params.tenant_id,
      product_id: params.product_id,
      options,
      incoming: parseVariantsInput(params.body.variants, options),
    });
  }

  const record = await prisma.shopProduct.update({
    where: withTenantScope(params.tenant_id, { id: params.product_id }),
    data,
    include: { variants: { orderBy: { created_at: "asc" } } },
  });
  return toProduct(record);
}

async function syncProductVariants(params: {
  tenant_id: string;
  product_id: string;
  options: ShopProductOption[];
  incoming: Array<ReturnType<typeof parseVariantInput> & { id?: string }>;
}): Promise<void> {
  const existing = await prisma.shopVariant.findMany({
    where: withTenantScope(params.tenant_id, { product_id: params.product_id }),
  });
  for (const variant of params.incoming) {
    if (variant.id && !existing.some((row) => row.id === variant.id)) {
      throw new NotFoundError("shop.variant_not_found");
    }
  }
  const clash = await prisma.shopVariant.findFirst({
    where: withTenantScope(params.tenant_id, {
      sku: { in: params.incoming.map((item) => item.sku) },
      NOT: { product_id: params.product_id },
    }),
    select: { id: true },
  });
  if (clash) throw new ConflictError("shop.sku_taken");

  const keepIds = new Set(
    params.incoming.flatMap((item) => (item.id ? [item.id] : [])),
  );
  await prisma.$transaction(async (tx) => {
    for (const variant of params.incoming) {
      const data = {
        sku: variant.sku,
        title: asJson(variant.title),
        option_values: toJson(variant.option_values),
        price_cents: variant.price_cents,
        currency: variant.currency,
        stock_qty: variant.stock_qty,
        weight_g: variant.weight_g,
        hs_code: variant.hs_code,
        origin_country: variant.origin_country,
      };
      if (variant.id) {
        await tx.shopVariant.update({
          where: withTenantScope(params.tenant_id, { id: variant.id }),
          data,
        });
      } else {
        await tx.shopVariant.create({
          data: {
            tenant_id: params.tenant_id,
            product_id: params.product_id,
            ...data,
          },
        });
      }
    }
    const removed = existing.filter((row) => !keepIds.has(row.id));
    for (const row of removed) {
      await tx.shopVariant.delete({
        where: withTenantScope(params.tenant_id, { id: row.id }),
      });
    }
  });
}

export async function deleteProduct(
  tenant_id: string,
  product_id: string,
): Promise<void> {
  await getProduct(tenant_id, product_id);
  await prisma.shopProduct.delete({
    where: withTenantScope(tenant_id, { id: product_id }),
  });
}

export async function addVariant(params: {
  tenant_id: string;
  product_id: string;
  body: ShopVariantInput;
}): Promise<ShopProduct> {
  const product = await getProduct(params.tenant_id, params.product_id);
  const variant = parseVariantInput(params.body);
  assertVariantMatchesOptions(product.options, variant.option_values);
  const clash = await prisma.shopVariant.findFirst({
    where: withTenantScope(params.tenant_id, { sku: variant.sku }),
    select: { id: true },
  });
  if (clash) throw new ConflictError("shop.sku_taken");
  await prisma.shopVariant.create({
    data: {
      tenant_id: params.tenant_id,
      product_id: params.product_id,
      sku: variant.sku,
      title: asJson(variant.title),
      option_values: toJson(variant.option_values),
      price_cents: variant.price_cents,
      currency: variant.currency,
      stock_qty: variant.stock_qty,
      weight_g: variant.weight_g,
      hs_code: variant.hs_code,
      origin_country: variant.origin_country,
    },
  });
  return getProduct(params.tenant_id, params.product_id);
}

export async function updateVariant(params: {
  tenant_id: string;
  product_id: string;
  variant_id: string;
  body: UpdateShopVariantBody;
}): Promise<ShopProduct> {
  const existing = await prisma.shopVariant.findFirst({
    where: withTenantScope(params.tenant_id, {
      id: params.variant_id,
      product_id: params.product_id,
    }),
  });
  if (!existing) throw new NotFoundError("shop.variant_not_found");

  const data: Record<string, unknown> = {};
  if (params.body.sku !== undefined) {
    const sku = validateSku(params.body.sku);
    const clash = await prisma.shopVariant.findFirst({
      where: withTenantScope(params.tenant_id, {
        sku,
        NOT: { id: params.variant_id },
      }),
      select: { id: true },
    });
    if (clash) throw new ConflictError("shop.sku_taken");
    data.sku = sku;
  }
  if (params.body.title !== undefined) {
    data.title = parseLocalizedInput(params.body.title, "zh-CN");
  }
  if (params.body.option_values !== undefined) {
    const product = await getProduct(params.tenant_id, params.product_id);
    const option_values = readOptionValues(params.body.option_values);
    assertVariantMatchesOptions(product.options, option_values);
    data.option_values = toJson(option_values);
  }
  if (params.body.price_cents !== undefined) {
    const price = asPositiveInt(params.body.price_cents);
    if (price < 1) throw new ValidationError("shop.price_invalid");
    data.price_cents = price;
  }
  if (params.body.currency !== undefined) {
    data.currency = normalizeCurrency(params.body.currency);
  }
  if (params.body.stock_qty !== undefined) {
    data.stock_qty = asPositiveInt(params.body.stock_qty);
  }
  if (params.body.weight_g !== undefined) {
    data.weight_g = asPositiveInt(params.body.weight_g);
  }
  if (params.body.hs_code !== undefined) {
    const hs = params.body.hs_code
      ? normalizeHsCode(params.body.hs_code)
      : null;
    if (params.body.hs_code && !hs) {
      throw new ValidationError("shop.hs_code_invalid");
    }
    data.hs_code = hs;
  }
  if (params.body.origin_country !== undefined) {
    const origin = params.body.origin_country
      ? normalizeCountry(params.body.origin_country)
      : null;
    if (params.body.origin_country && !origin) {
      throw new ValidationError("shop.country_invalid");
    }
    data.origin_country = origin;
  }

  await prisma.shopVariant.update({
    where: withTenantScope(params.tenant_id, { id: params.variant_id }),
    data,
  });
  return getProduct(params.tenant_id, params.product_id);
}

export async function deleteVariant(params: {
  tenant_id: string;
  product_id: string;
  variant_id: string;
}): Promise<ShopProduct> {
  const count = await prisma.shopVariant.count({
    where: withTenantScope(params.tenant_id, { product_id: params.product_id }),
  });
  if (count <= 1) {
    throw new ValidationError("shop.last_variant");
  }
  const existing = await prisma.shopVariant.findFirst({
    where: withTenantScope(params.tenant_id, {
      id: params.variant_id,
      product_id: params.product_id,
    }),
  });
  if (!existing) throw new NotFoundError("shop.variant_not_found");
  await prisma.shopVariant.delete({
    where: withTenantScope(params.tenant_id, { id: params.variant_id }),
  });
  return getProduct(params.tenant_id, params.product_id);
}
