import { api } from "@rewindom/module-sdk/client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateShopProductBody,
  ShopOrderDetail,
  ShopOrderListItem,
  ShopProduct,
  ShopProductListItem,
  ShopProviderStatus,
  ShopSettingView,
  ShopShippingZoneView,
  UpdateShopProductBody,
  UpdateShopProviderBody,
  UpdateShopSettingBody,
  ShopCollection,
  ShopCollectionListItem,
  CreateShopCollectionBody,
  UpdateShopCollectionBody,
  ShopDiscount,
  ShopDiscountListItem,
  CreateShopDiscountBody,
  UpdateShopDiscountBody,
  RefundShopOrderBody,
} from "../../shared/index.js";

export function useProducts(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: ["shop-products", page, pageSize, q, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: ShopProductListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/shop/products", params);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateShopProductBody) =>
      api.post<ShopProduct>("/shop/products", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateShopProductBody & { id: string }) =>
      api.patch<ShopProduct>(`/shop/products/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
}

export function useProduct(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["shop-products", "detail", id],
    enabled: Boolean(id) && enabled,
    queryFn: () => api.get<ShopProduct>(`/shop/products/${id}`),
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      product_id: string;
      variant_id: string;
      stock_qty?: number;
      price_cents?: number;
      hs_code?: string | null;
      origin_country?: string | null;
    }) =>
      api.patch<ShopProduct>(
        `/shop/products/${input.product_id}/variants/${input.variant_id}`,
        {
          stock_qty: input.stock_qty,
          price_cents: input.price_cents,
          hs_code: input.hs_code,
          origin_country: input.origin_country,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/shop/products/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
}

export function useOrders(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: ["shop-orders", page, pageSize, q, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: ShopOrderListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/shop/orders", params);
    },
  });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["shop-orders", orderId],
    enabled: Boolean(orderId),
    queryFn: () => api.get<ShopOrderDetail>(`/shop/orders/${orderId}`),
  });
}

export function useFulfillOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      carrier_code: string;
      tracking_number: string;
    }) =>
      api.post<ShopOrderDetail>(`/shop/orders/${input.id}/fulfill`, {
        carrier_code: input.carrier_code,
        tracking_number: input.tracking_number,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-orders"] });
    },
  });
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<ShopOrderDetail>(`/shop/orders/${id}/complete`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-orders"] });
    },
  });
}

export function useShippingZones() {
  return useQuery({
    queryKey: ["shop-shipping"],
    queryFn: () => api.get<ShopShippingZoneView[]>("/shop/shipping-zones"),
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; countries: string[] }) =>
      api.post<ShopShippingZoneView>("/shop/shipping-zones", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-shipping"] });
    },
  });
}

export function useCreateRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      zone_id: string;
      name: string;
      carrier_code: string;
      price_cents: number;
    }) =>
      api.post<ShopShippingZoneView>(
        `/shop/shipping-zones/${input.zone_id}/rates`,
        {
          name: input.name,
          carrier_code: input.carrier_code,
          price_cents: input.price_cents,
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-shipping"] });
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/shop/shipping-zones/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-shipping"] });
    },
  });
}

export function useShopSettings() {
  return useQuery({
    queryKey: ["shop-settings"],
    queryFn: () =>
      api.get<{ setting: ShopSettingView; provider: ShopProviderStatus }>(
        "/shop/settings",
      ),
  });
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateShopSettingBody) =>
      api.patch<{ setting: ShopSettingView; provider: ShopProviderStatus }>(
        "/shop/settings",
        body,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-settings"] });
    },
  });
}

export function useUpdateShopProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateShopProviderBody) =>
      api.put<ShopProviderStatus>("/shop/provider", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-settings"] });
    },
  });
}

export function useCollections(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: ["shop-collections", page, pageSize, q, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: ShopCollectionListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/shop/collections", params);
    },
  });
}

export function useCollection(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["shop-collections", "detail", id],
    enabled: Boolean(id) && enabled,
    queryFn: () => api.get<ShopCollection>(`/shop/collections/${id}`),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateShopCollectionBody) =>
      api.post<ShopCollection>("/shop/collections", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-collections"] });
      await queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateShopCollectionBody & { id: string }) =>
      api.patch<ShopCollection>(`/shop/collections/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-collections"] });
      await queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/shop/collections/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-collections"] });
      await queryClient.invalidateQueries({ queryKey: ["shop-products"] });
    },
  });
}

export function useDiscounts(
  page?: number,
  pageSize?: number,
  q?: string,
  sortBy?: string,
  sortDir?: "asc" | "desc",
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: ["shop-discounts", page, pageSize, q, sortBy, sortDir],
    queryFn: () => {
      const params: Record<string, number | string> = {};
      if (page !== undefined) params.page = page;
      if (pageSize !== undefined) params.page_size = pageSize;
      if (q) params.q = q;
      if (sortBy?.trim()) params.sort_by = sortBy;
      if (sortDir) params.sort_dir = sortDir;
      return api.get<{
        items: ShopDiscountListItem[];
        page: number;
        page_size: number;
        total: number;
        page_count: number;
      }>("/shop/discounts", params);
    },
  });
}

export function useDiscount(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["shop-discounts", "detail", id],
    enabled: Boolean(id) && enabled,
    queryFn: () => api.get<ShopDiscount>(`/shop/discounts/${id}`),
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateShopDiscountBody) =>
      api.post<ShopDiscount>("/shop/discounts", body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-discounts"] });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateShopDiscountBody & { id: string }) =>
      api.patch<ShopDiscount>(`/shop/discounts/${id}`, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-discounts"] });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/shop/discounts/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-discounts"] });
    },
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RefundShopOrderBody & { id: string }) =>
      api.post<ShopOrderDetail>(`/shop/orders/${input.id}/refund`, {
        restock: input.restock,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shop-orders"] });
    },
  });
}
