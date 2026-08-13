import {
  ConflictError,
  NotFoundError,
  ValidationError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import {
  isShopDiscountStatus,
  isShopDiscountType,
  normalizeDiscountCode,
  type CreateShopDiscountBody,
  type ShopDiscount,
  type ShopDiscountListItem,
  type ShopDiscountStatus,
  type ShopDiscountType,
  type UpdateShopDiscountBody,
} from "../../shared/index.js";

const DISCOUNT_SORTABLE = new Set([
  "code",
  "status",
  "updated_at",
  "created_at",
  "used_count",
]);

function toDiscount(record: {
  id: string;
  tenant_id: string;
  code: string;
  type: string;
  value: number;
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: Date | null;
  ends_at: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}): ShopDiscount {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    code: record.code,
    type: isShopDiscountType(record.type) ? record.type : "percent",
    value: record.value,
    min_subtotal_cents: record.min_subtotal_cents,
    max_uses: record.max_uses,
    used_count: record.used_count,
    starts_at: record.starts_at?.toISOString() ?? null,
    ends_at: record.ends_at?.toISOString() ?? null,
    status: isShopDiscountStatus(record.status) ? record.status : "draft",
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

function parseCode(value: unknown): string {
  const code = normalizeDiscountCode(value);
  if (!code) throw new ValidationError("shop.discount_code_invalid");
  return code;
}

function parseType(value: unknown): ShopDiscountType {
  if (!isShopDiscountType(value)) throw new ValidationError("shop.discount_type_invalid");
  return value;
}

function parseValue(type: ShopDiscountType, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError("shop.discount_value_invalid");
  }
  const n = Math.trunc(value);
  if (type === "percent" && (n < 1 || n > 100)) {
    throw new ValidationError("shop.discount_value_invalid");
  }
  if (type === "fixed" && n < 1) {
    throw new ValidationError("shop.discount_value_invalid");
  }
  return n;
}

function parseOptionalInt(value: unknown, allowNull: boolean): number | null {
  if (value == null || value === "") return allowNull ? null : 0;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError("shop.discount_value_invalid");
  }
  const n = Math.trunc(value);
  if (n < 0) throw new ValidationError("shop.discount_value_invalid");
  return n;
}

function parseOptionalDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new ValidationError("shop.discount_date_invalid");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("shop.discount_date_invalid");
  }
  return date;
}

export async function listDiscounts(params: {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<{
  items: ShopDiscountListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}> {
  const skip = (params.page - 1) * params.page_size;
  const field = resolveSortField(params.sort_by, DISCOUNT_SORTABLE, "updated_at");
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = withTenantScope(params.tenant_id, {
    ...(params.q?.trim()
      ? {
          code: {
            contains: params.q.trim().toUpperCase(),
            mode: "insensitive" as const,
          },
        }
      : {}),
  });
  const [records, total] = await Promise.all([
    prisma.shopDiscount.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: params.page_size,
    }),
    prisma.shopDiscount.count({ where }),
  ]);
  return {
    items: records.map((record) => {
      const full = toDiscount(record);
      return {
        id: full.id,
        code: full.code,
        type: full.type,
        value: full.value,
        status: full.status,
        used_count: full.used_count,
        max_uses: full.max_uses,
        updated_at: full.updated_at,
      };
    }),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function getDiscount(
  tenant_id: string,
  discount_id: string,
): Promise<ShopDiscount> {
  const record = await prisma.shopDiscount.findFirst({
    where: withTenantScope(tenant_id, { id: discount_id }),
  });
  if (!record) throw new NotFoundError("shop.discount_not_found");
  return toDiscount(record);
}

export async function findDiscountByCode(
  tenant_id: string,
  code: string,
): Promise<ShopDiscount | null> {
  const record = await prisma.shopDiscount.findFirst({
    where: withTenantScope(tenant_id, { code }),
  });
  return record ? toDiscount(record) : null;
}

export async function createDiscount(params: {
  tenant_id: string;
  body: CreateShopDiscountBody;
}): Promise<ShopDiscount> {
  const code = parseCode(params.body.code);
  const type = parseType(params.body.type);
  const value = parseValue(type, params.body.value);
  const status: ShopDiscountStatus = isShopDiscountStatus(params.body.status)
    ? params.body.status
    : "draft";
  const clash = await prisma.shopDiscount.findFirst({
    where: withTenantScope(params.tenant_id, { code }),
    select: { id: true },
  });
  if (clash) throw new ConflictError("shop.discount_code_taken");
  const record = await prisma.shopDiscount.create({
    data: {
      tenant_id: params.tenant_id,
      code,
      type,
      value,
      min_subtotal_cents: parseOptionalInt(params.body.min_subtotal_cents, false) ?? 0,
      max_uses: parseOptionalInt(params.body.max_uses, true),
      starts_at: parseOptionalDate(params.body.starts_at),
      ends_at: parseOptionalDate(params.body.ends_at),
      status,
    },
  });
  return toDiscount(record);
}

export async function updateDiscount(params: {
  tenant_id: string;
  discount_id: string;
  body: UpdateShopDiscountBody;
}): Promise<ShopDiscount> {
  const current = await getDiscount(params.tenant_id, params.discount_id);
  const type = params.body.type !== undefined ? parseType(params.body.type) : current.type;
  const data: {
    code?: string;
    type?: string;
    value?: number;
    min_subtotal_cents?: number;
    max_uses?: number | null;
    starts_at?: Date | null;
    ends_at?: Date | null;
    status?: string;
  } = {};
  if (params.body.code !== undefined) {
    const code = parseCode(params.body.code);
    const clash = await prisma.shopDiscount.findFirst({
      where: withTenantScope(params.tenant_id, {
        code,
        NOT: { id: params.discount_id },
      }),
      select: { id: true },
    });
    if (clash) throw new ConflictError("shop.discount_code_taken");
    data.code = code;
  }
  if (params.body.type !== undefined) data.type = type;
  if (params.body.value !== undefined) {
    data.value = parseValue(type, params.body.value);
  } else if (params.body.type !== undefined) {
    data.value = parseValue(type, current.value);
  }
  if (params.body.min_subtotal_cents !== undefined) {
    data.min_subtotal_cents =
      parseOptionalInt(params.body.min_subtotal_cents, false) ?? 0;
  }
  if (params.body.max_uses !== undefined) {
    data.max_uses = parseOptionalInt(params.body.max_uses, true);
  }
  if (params.body.starts_at !== undefined) {
    data.starts_at = parseOptionalDate(params.body.starts_at);
  }
  if (params.body.ends_at !== undefined) {
    data.ends_at = parseOptionalDate(params.body.ends_at);
  }
  if (params.body.status !== undefined) {
    if (!isShopDiscountStatus(params.body.status)) {
      throw new ValidationError("shop.status_invalid");
    }
    data.status = params.body.status;
  }
  const record = await prisma.shopDiscount.update({
    where: withTenantScope(params.tenant_id, { id: params.discount_id }),
    data,
  });
  return toDiscount(record);
}

export async function deleteDiscount(
  tenant_id: string,
  discount_id: string,
): Promise<void> {
  const existing = await prisma.shopDiscount.findFirst({
    where: withTenantScope(tenant_id, { id: discount_id }),
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("shop.discount_not_found");
  await prisma.shopDiscount.delete({
    where: withTenantScope(tenant_id, { id: discount_id }),
  });
}
