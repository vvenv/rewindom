import {
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import type {
  CarrierProvider,
  CarrierQuoteInput,
  CreateShopShippingRateBody,
  CreateShopShippingZoneBody,
  ShopShippingQuote,
  ShopShippingRateView,
  ShopShippingZoneView,
  UpdateShopShippingRateBody,
  UpdateShopShippingZoneBody,
} from "../../shared/index.js";
import { asPositiveInt, normalizeCountry } from "../lib/format.js";

function parseCountries(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError("shop.countries_invalid");
  }
  const countries = [
    ...new Set(
      value
        .map((item) => (typeof item === "string" ? normalizeCountry(item) : null))
        .filter((item): item is string => Boolean(item)),
    ),
  ];
  if (countries.length === 0) {
    throw new ValidationError("shop.countries_invalid");
  }
  return countries;
}

function toRate(record: {
  id: string;
  zone_id: string;
  name: string;
  carrier_code: string;
  price_cents: number;
  min_days: number | null;
  max_days: number | null;
}): ShopShippingRateView {
  return {
    id: record.id,
    zone_id: record.zone_id,
    name: record.name,
    carrier_code: record.carrier_code,
    price_cents: record.price_cents,
    min_days: record.min_days,
    max_days: record.max_days,
  };
}

function toZone(record: {
  id: string;
  name: string;
  countries: unknown;
  rates: Parameters<typeof toRate>[0][];
}): ShopShippingZoneView {
  const countries = Array.isArray(record.countries)
    ? record.countries.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: record.id,
    name: record.name,
    countries,
    rates: record.rates.map(toRate),
  };
}

export async function listShippingZones(
  tenantId: string,
): Promise<ShopShippingZoneView[]> {
  const rows = await prisma.shopShippingZone.findMany({
    where: withTenantScope(tenantId, {}),
    orderBy: { name: "asc" },
    include: { rates: { orderBy: { price_cents: "asc" } } },
  });
  return rows.map(toZone);
}

export async function createShippingZone(
  tenantId: string,
  body: CreateShopShippingZoneBody,
): Promise<ShopShippingZoneView> {
  const name = body.name.trim();
  if (!name) throw new ValidationError("shop.zone_name_required");
  const countries = parseCountries(body.countries);
  const row = await prisma.shopShippingZone.create({
    data: { tenant_id: tenantId, name, countries },
    include: { rates: true },
  });
  return toZone(row);
}

export async function updateShippingZone(
  tenantId: string,
  zoneId: string,
  body: UpdateShopShippingZoneBody,
): Promise<ShopShippingZoneView> {
  const existing = await prisma.shopShippingZone.findFirst({
    where: withTenantScope(tenantId, { id: zoneId }),
  });
  if (!existing) throw new NotFoundError("shop.zone_not_found");
  const row = await prisma.shopShippingZone.update({
    where: withTenantScope(tenantId, { id: zoneId }),
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.countries !== undefined
        ? { countries: parseCountries(body.countries) }
        : {}),
    },
    include: { rates: { orderBy: { price_cents: "asc" } } },
  });
  return toZone(row);
}

export async function deleteShippingZone(
  tenantId: string,
  zoneId: string,
): Promise<void> {
  const existing = await prisma.shopShippingZone.findFirst({
    where: withTenantScope(tenantId, { id: zoneId }),
  });
  if (!existing) throw new NotFoundError("shop.zone_not_found");
  await prisma.shopShippingZone.delete({
    where: withTenantScope(tenantId, { id: zoneId }),
  });
}

export async function createShippingRate(
  tenantId: string,
  zoneId: string,
  body: CreateShopShippingRateBody,
): Promise<ShopShippingZoneView> {
  const zone = await prisma.shopShippingZone.findFirst({
    where: withTenantScope(tenantId, { id: zoneId }),
  });
  if (!zone) throw new NotFoundError("shop.zone_not_found");
  const name = body.name.trim();
  const carrier = body.carrier_code.trim();
  if (!name) throw new ValidationError("shop.rate_name_required");
  if (!carrier) throw new ValidationError("shop.carrier_required");
  await prisma.shopShippingRate.create({
    data: {
      tenant_id: tenantId,
      zone_id: zoneId,
      name,
      carrier_code: carrier,
      price_cents: asPositiveInt(body.price_cents),
      min_days: body.min_days ?? null,
      max_days: body.max_days ?? null,
    },
  });
  const updated = await prisma.shopShippingZone.findFirst({
    where: withTenantScope(tenantId, { id: zoneId }),
    include: { rates: { orderBy: { price_cents: "asc" } } },
  });
  if (!updated) throw new NotFoundError("shop.zone_not_found");
  return toZone(updated);
}

export async function updateShippingRate(
  tenantId: string,
  zoneId: string,
  rateId: string,
  body: UpdateShopShippingRateBody,
): Promise<ShopShippingZoneView> {
  const existing = await prisma.shopShippingRate.findFirst({
    where: withTenantScope(tenantId, { id: rateId, zone_id: zoneId }),
  });
  if (!existing) throw new NotFoundError("shop.rate_not_found");
  await prisma.shopShippingRate.update({
    where: withTenantScope(tenantId, { id: rateId }),
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.carrier_code !== undefined
        ? { carrier_code: body.carrier_code.trim() }
        : {}),
      ...(body.price_cents !== undefined
        ? { price_cents: asPositiveInt(body.price_cents) }
        : {}),
      ...(body.min_days !== undefined ? { min_days: body.min_days } : {}),
      ...(body.max_days !== undefined ? { max_days: body.max_days } : {}),
    },
  });
  const zone = await prisma.shopShippingZone.findFirst({
    where: withTenantScope(tenantId, { id: zoneId }),
    include: { rates: { orderBy: { price_cents: "asc" } } },
  });
  if (!zone) throw new NotFoundError("shop.zone_not_found");
  return toZone(zone);
}

export async function deleteShippingRate(
  tenantId: string,
  zoneId: string,
  rateId: string,
): Promise<void> {
  const existing = await prisma.shopShippingRate.findFirst({
    where: withTenantScope(tenantId, { id: rateId, zone_id: zoneId }),
  });
  if (!existing) throw new NotFoundError("shop.rate_not_found");
  await prisma.shopShippingRate.delete({
    where: withTenantScope(tenantId, { id: rateId }),
  });
}

export class TableCarrierProvider implements CarrierProvider {
  readonly id = "table";

  constructor(private readonly tenantId: string) {}

  async quote(input: CarrierQuoteInput): Promise<ShopShippingQuote[]> {
    const country = normalizeCountry(input.destination_country);
    if (!country) return [];
    const zones = await listShippingZones(this.tenantId);
    const matched = zones.filter((zone) => zone.countries.includes(country));
    return matched.flatMap((zone) =>
      zone.rates.map((rate) => ({ ...rate, zone_name: zone.name })),
    );
  }
}

export async function getShippingRate(
  tenantId: string,
  rateId: string,
): Promise<ShopShippingQuote> {
  const rate = await prisma.shopShippingRate.findFirst({
    where: withTenantScope(tenantId, { id: rateId }),
    include: { zone: true },
  });
  if (!rate) throw new NotFoundError("shop.rate_not_found");
  const countries = Array.isArray(rate.zone.countries)
    ? rate.zone.countries.filter((item): item is string => typeof item === "string")
    : [];
  return {
    ...toRate(rate),
    zone_name: rate.zone.name,
    // zone countries not part of quote type; callers check separately
    ...(countries.length ? {} : {}),
  };
}

export async function assertRateServesCountry(
  tenantId: string,
  rateId: string,
  country: string,
): Promise<ShopShippingQuote> {
  const quote = await getShippingRate(tenantId, rateId);
  const rate = await prisma.shopShippingRate.findFirst({
    where: withTenantScope(tenantId, { id: rateId }),
    include: { zone: true },
  });
  const countries = Array.isArray(rate?.zone.countries)
    ? rate.zone.countries.filter((item): item is string => typeof item === "string")
    : [];
  if (!countries.includes(country)) {
    throw new ValidationError("shop.rate_country_mismatch");
  }
  return quote;
}
