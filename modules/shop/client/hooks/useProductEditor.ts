import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError } from "@rewindom/module-sdk/client";
import { DEFAULT_LOCALE, type AppLocale } from "@rewindom/module-sdk";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import { useCreateProduct, useProduct, useUpdateProduct } from "./useShop.js";
import {
  buildProductPayload,
  INITIAL_PRODUCT_FORM,
  productToForm,
  syncVariantsToOptions,
  validateProductForm,
  type ProductFormValues,
} from "../lib/product-form.js";

import type { ShopProductOption } from "../../shared/catalog.js";

export function useProductEditor(productId: string | undefined) {
  const { t } = useTranslation("shop");
  const navigate = useNavigate();
  const isCreate = !productId;
  const { data, isLoading } = useProduct(productId, Boolean(productId));
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [form, setForm] = useState<ProductFormValues>(INITIAL_PRODUCT_FORM);
  const [contentLocale, setContentLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;
    setForm(productToForm(data));
  }, [data]);

  const setFormAndSync = (next: ProductFormValues): ProductFormValues => ({
    ...next,
    variants: syncVariantsToOptions(next.options, next.variants, next.slug),
  });

  const patch = (partial: Partial<ProductFormValues>): void => {
    setForm((current) => {
      const next = { ...current, ...partial };
      if (partial.options || partial.slug !== undefined) {
        return setFormAndSync(next);
      }
      return next;
    });
  };

  const setOptions = (options: ShopProductOption[]): void => {
    setForm((current) => setFormAndSync({ ...current, options }));
  };

  const submit = async (): Promise<void> => {
    const validationError = validateProductForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    const payload = buildProductPayload(form);
    try {
      if (isCreate) {
        const created = await createProduct.mutateAsync(payload);
        toast.success(t("toastCreated"));
        navigate(`/app/shop/products/${created.id}`, { replace: true });
        return;
      }
      await updateProduct.mutateAsync({ id: productId, ...payload });
      toast.success(t("toastUpdated"));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isCreate
            ? t("createFailed")
            : t("updateFailed"),
      );
    }
  };

  return {
    isCreate,
    isLoading: Boolean(productId) && isLoading,
    form,
    patch,
    setOptions,
    contentLocale,
    setContentLocale,
    error,
    submit,
    pending: createProduct.isPending || updateProduct.isPending,
  };
}
