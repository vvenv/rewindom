import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { Switch } from "@rewindom/ui/switch";
import { toast } from "@rewindom/ui/toast";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useProduct, useUpdateProduct, useUpdateVariant } from "../hooks/useShop.js";
import {
  INITIAL_PRODUCT_FORM,
  validateProductForm,
  type ProductFormValues,
} from "../lib/product-form.js";

import type { ShopProductListItem } from "../../shared/index.js";

export function ProductEditSheet({
  product,
  children,
}: {
  product: ShopProductListItem;
  children?: ReactNode;
}) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(INITIAL_PRODUCT_FORM);
  const [error, setError] = useState("");
  const { data: detail, isLoading } = useProduct(product.id, open);
  const updateProduct = useUpdateProduct();
  const updateVariant = useUpdateVariant();

  useEffect(() => {
    if (!detail) return;
    const variant = detail.variants[0];
    setForm({
      title: detail.title["zh-CN"] ?? Object.values(detail.title)[0] ?? "",
      title_en: detail.title.en ?? "",
      slug: detail.slug,
      status: detail.status,
      sku: variant?.sku ?? "",
      price_cents: variant ? String(variant.price_cents) : "",
      stock_qty: variant ? String(variant.stock_qty) : "0",
      weight_g: variant ? String(variant.weight_g) : "0",
      hs_code: variant?.hs_code ?? "",
      origin_country: variant?.origin_country ?? "",
    });
  }, [detail]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateProductForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!detail) return;
    try {
      const title: Record<string, string> = { "zh-CN": form.title.trim() };
      if (form.title_en.trim()) title.en = form.title_en.trim();
      await updateProduct.mutateAsync({
        id: detail.id,
        slug: form.slug.trim().toLowerCase(),
        status: form.status,
        title,
      });
      const variant = detail.variants[0];
      if (variant) {
        await updateVariant.mutateAsync({
          product_id: detail.id,
          variant_id: variant.id,
          price_cents: Math.trunc(Number(form.price_cents)),
          stock_qty: Math.max(0, Math.trunc(Number(form.stock_qty) || 0)),
          hs_code: form.hs_code.trim() || null,
          origin_country: form.origin_country.trim().toUpperCase() || null,
        });
      }
      toast.success(t("toastUpdated"));
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("updateFailed"));
    }
  };

  const set =
    (key: keyof ProductFormValues) =>
    (event: { target: { value: string } }) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const pending = updateProduct.isPending || updateVariant.isPending;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError("");
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="icon" aria-label={t("edit")}>
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("editTitle")}</SheetTitle>
            <SheetDescription>{t("editDescription")}</SheetDescription>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            {isLoading ? <Spinner className="size-4" /> : null}
            <Field>
              <FieldLabel htmlFor={`edit-title-${product.id}`}>
                {t("fieldTitle")}
              </FieldLabel>
              <Input
                id={`edit-title-${product.id}`}
                value={form.title}
                onChange={set("title")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-slug-${product.id}`} className="flex items-center gap-1">
                {t("fieldSlug")}
                <FieldInfoTip text={t("infoSlug")} side="left" />
              </FieldLabel>
              <Input
                id={`edit-slug-${product.id}`}
                value={form.slug}
                onChange={set("slug")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-price-${product.id}`}>
                {t("fieldPrice")}
              </FieldLabel>
              <Input
                id={`edit-price-${product.id}`}
                type="number"
                min={1}
                value={form.price_cents}
                onChange={set("price_cents")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-stock-${product.id}`}>
                {t("fieldStock")}
              </FieldLabel>
              <Input
                id={`edit-stock-${product.id}`}
                type="number"
                min={0}
                value={form.stock_qty}
                onChange={set("stock_qty")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-hs-${product.id}`} className="flex items-center gap-1">
                {t("fieldHs")}
                <FieldInfoTip text={t("infoHs")} side="left" />
              </FieldLabel>
              <Input
                id={`edit-hs-${product.id}`}
                value={form.hs_code}
                onChange={set("hs_code")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-published-${product.id}`}>
                {t("statusPublished")}
              </FieldLabel>
              <Switch
                id={`edit-published-${product.id}`}
                checked={form.status === "published"}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    status: checked ? "published" : "draft",
                  }))
                }
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={pending || isLoading}>
              {pending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
