import { useEffect, useMemo, useState, type ReactElement } from "react";

import { getLocaleNativeLabel, normalizeLocale, type AppLocale } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Field, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@be-water/ui/sheet";
import { toast } from "@be-water/ui/toast";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  categoryKeyFromLabel,
  resolveCategoryLabel,
  validateCategoryKey,
  type MarketingDocCategory,
} from "../../shared/marketing-doc-category.js";
import { isLocalizedText } from "../../shared/section-settings.js";
import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSite } from "../hooks/useSite.js";
import {
  useCreateSiteDocCategory,
  useDeleteSiteDocCategory,
  useSiteDocCategories,
  useUpdateSiteDocCategory,
} from "../hooks/useSiteDocs.js";

interface LabelForm {
  key: string;
  labels: Record<AppLocale, string>;
}

function emptyLabelForm(locales: readonly AppLocale[]): LabelForm {
  const labels = Object.fromEntries(
    locales.map((locale) => [locale, ""]),
  ) as Record<AppLocale, string>;
  return { key: "", labels };
}

function categoryToForm(
  category: MarketingDocCategory,
  locales: readonly AppLocale[],
): LabelForm {
  const labels = emptyLabelForm(locales).labels;
  if (typeof category.label === "string") {
    labels[locales[0]!] = category.label;
  } else if (isLocalizedText(category.label)) {
    for (const locale of locales) {
      labels[locale] = category.label.__i18n[locale] ?? "";
    }
  }
  return { key: category.key, labels };
}

function formToLabel(
  form: LabelForm,
  locales: readonly AppLocale[],
  defaultLocale: AppLocale,
): string | { __i18n: Record<string, string> } {
  const filled = locales
    .map((locale) => [locale, form.labels[locale]?.trim() ?? ""] as const)
    .filter(([, text]) => text !== "");
  if (filled.length === 0) return "";
  if (filled.length === 1 && filled[0]![0] === defaultLocale) {
    return filled[0]![1];
  }
  return { __i18n: Object.fromEntries(filled) };
}

export function SiteDocCategorySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const siteQuery = useSite();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const locales = useMemo(
    () => siteLocaleOrder(defaultLocale),
    [defaultLocale],
  );
  const { data: categories = [], isLoading } = useSiteDocCategories(open);
  const create = useCreateSiteDocCategory();
  const update = useUpdateSiteDocCategory();
  const remove = useDeleteSiteDocCategory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LabelForm>(() => emptyLabelForm(locales));

  const editing = useMemo(
    () => categories.find((category) => category.id === editingId) ?? null,
    [categories, editingId],
  );

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setForm(emptyLabelForm(locales));
      return;
    }
    if (editingId) {
      const category = categories.find((item) => item.id === editingId);
      if (category) {
        setForm(categoryToForm(category, locales));
        return;
      }
    }
    setForm(emptyLabelForm(locales));
    // Sync form when sheet opens or selection changes; omit `categories` to avoid
    // resetting while typing when the query refetches.
  }, [open, editingId, locales]);

  const primaryLabel = form.labels[defaultLocale]?.trim() ?? "";
  const suggestedKey = primaryLabel ? categoryKeyFromLabel(primaryLabel) : "";

  const save = async (): Promise<void> => {
    const label = formToLabel(form, locales, defaultLocale);
    if (!label) {
      toast.error(t("siteDocs.categoryLabelRequired"));
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({
          categoryId: editing.id,
          body: { label },
        });
        toast.success(t("siteDocs.categorySaved"));
        setEditingId(null);
        return;
      }
      const key = (form.key.trim() || suggestedKey).toLowerCase();
      validateCategoryKey(key);
      await create.mutateAsync({ key, label });
      toast.success(t("siteDocs.categoryCreated"));
      setForm(emptyLabelForm(locales));
    } catch {
      toast.error(t("siteDocs.categorySaveFailed"));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("siteDocs.manageCategories")}</SheetTitle>
          <SheetDescription>
            {t("siteDocs.manageCategoriesHint")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-2">
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{t("siteDocs.loading")}</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("siteDocs.noCategories")}
              </p>
            ) : (
              categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/50"
                  onClick={() => setEditingId(category.id)}
                >
                  <span className="font-medium">{category.key}</span>
                  <span className="truncate text-muted-foreground">
                    {resolveCategoryLabel(
                      category.label,
                      defaultLocale,
                      defaultLocale,
                    )}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">
              {editing
                ? t("siteDocs.editCategory", { key: editing.key })
                : t("siteDocs.newCategory")}
            </p>
            {!editing ? (
              <Field>
                <FieldLabel htmlFor="doc-category-key">
                  {t("siteDocs.categoryKey")}
                </FieldLabel>
                <Input
                  id="doc-category-key"
                  value={form.key}
                  placeholder={suggestedKey || t("siteDocs.categoryKeyPlaceholder")}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, key: event.target.value }))
                  }
                />
              </Field>
            ) : null}
            {locales.map((locale) => (
              <Field key={locale}>
                <FieldLabel htmlFor={`doc-category-label-${locale}`}>
                  {getLocaleNativeLabel(locale)}
                </FieldLabel>
                <Input
                  id={`doc-category-label-${locale}`}
                  value={form.labels[locale] ?? ""}
                  placeholder={t("siteDocs.categoryLabelPlaceholder")}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      labels: {
                        ...prev.labels,
                        [locale]: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
            ))}
          </div>
        </div>

        <SheetFooter className="flex-row flex-wrap gap-2 sm:justify-between">
          {editing ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => {
                void remove.mutateAsync(editing.id).then(
                  () => {
                    toast.success(t("siteDocs.categoryDeleted"));
                    setEditingId(null);
                  },
                  () => toast.error(t("siteDocs.categoryDeleteFailed")),
                );
              }}
            >
              <Trash2 className="size-4" />
              {t("siteDocs.deleteCategory")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {editing ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingId(null)}
              >
                {t("siteDocs.cancelCategoryEdit")}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={create.isPending || update.isPending}
              onClick={() => void save()}
            >
              {editing ? t("siteDocs.saveCategory") : t("siteDocs.createCategory")}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
