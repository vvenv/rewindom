import { useState, type FormEvent, type ReactNode } from "react";

import { ApiError, FieldInfoTip } from "@be-water/module-sdk/client";
import { Button } from "@be-water/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Switch } from "@be-water/ui/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { toast } from "@be-water/ui/toast";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useCreateProduct } from "../hooks/useShop.js";
import {
  buildProductPayload,
  INITIAL_PRODUCT_FORM,
  validateProductForm,
  type ProductFormValues,
} from "../lib/product-form.js";

export function ProductCreateSheet({ children }: { children?: ReactNode }) {
  const { t } = useTranslation("shop");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductFormValues>(INITIAL_PRODUCT_FORM);
  const [error, setError] = useState("");
  const createMutation = useCreateProduct();

  const reset = () => {
    setForm(INITIAL_PRODUCT_FORM);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateProductForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await createMutation.mutateAsync(buildProductPayload(form));
      toast.success(t("toastCreated"));
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("createFailed"));
    }
  };

  const set =
    (key: keyof ProductFormValues) =>
    (event: { target: { value: string } }) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="size-4" />
            {t("create")}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t("createTitle")}</SheetTitle>
            <SheetDescription>{t("createDescription")}</SheetDescription>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="shop-title">{t("fieldTitle")}</FieldLabel>
              <Input id="shop-title" value={form.title} onChange={set("title")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-title-en">{t("fieldTitleEn")}</FieldLabel>
              <Input
                id="shop-title-en"
                value={form.title_en}
                onChange={set("title_en")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-slug" className="flex items-center gap-1">
                {t("fieldSlug")}
                <FieldInfoTip text={t("infoSlug")} side="left" />
              </FieldLabel>
              <Input id="shop-slug" value={form.slug} onChange={set("slug")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-sku">{t("fieldSku")}</FieldLabel>
              <Input id="shop-sku" value={form.sku} onChange={set("sku")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-price">{t("fieldPrice")}</FieldLabel>
              <Input
                id="shop-price"
                type="number"
                min={1}
                value={form.price_cents}
                onChange={set("price_cents")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-stock">{t("fieldStock")}</FieldLabel>
              <Input
                id="shop-stock"
                type="number"
                min={0}
                value={form.stock_qty}
                onChange={set("stock_qty")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-weight">{t("fieldWeight")}</FieldLabel>
              <Input
                id="shop-weight"
                type="number"
                min={0}
                value={form.weight_g}
                onChange={set("weight_g")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-published">{t("statusPublished")}</FieldLabel>
              <Switch
                id="shop-published"
                checked={form.status === "published"}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    status: checked ? "published" : "draft",
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-hs" className="flex items-center gap-1">
                {t("fieldHs")}
                <FieldInfoTip text={t("infoHs")} side="left" />
              </FieldLabel>
              <Input id="shop-hs" value={form.hs_code} onChange={set("hs_code")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="shop-origin">{t("fieldOrigin")}</FieldLabel>
              <Input
                id="shop-origin"
                value={form.origin_country}
                onChange={set("origin_country")}
                maxLength={2}
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
