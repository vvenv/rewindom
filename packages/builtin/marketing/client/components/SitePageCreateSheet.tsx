import { type FormEvent, type ReactNode, useState } from "react";

import {
  getLocaleNativeLabel,
  normalizeLocale,
  type AppLocale,
} from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
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
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { siteLocaleOrder } from "../../shared/site-locale.js";
import { useSite, useSiteMutations } from "../hooks/useSite.js";

import type { MarketingPageKind } from "../../shared/site-cms.js";

interface SitePageCreateSheetProps {
  children: ReactNode;
}

/**
 * 新建页面。
 *
 * 建完**直接进编辑器**：一张空白页在列表里什么也说明不了，建页的下一步一定是去铺内容。
 */
export function SitePageCreateSheet({ children }: SitePageCreateSheetProps) {
  const { t } = useTranslation("marketing");
  const { createPage } = useSiteMutations();
  const navigate = useNavigate();
  const siteQuery = useSite();
  const defaultLocale = normalizeLocale(siteQuery.data?.default_locale);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MarketingPageKind>("page");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [locale, setLocale] = useState<AppLocale | null>(null);

  const targetLocale = locale ?? defaultLocale;

  const reset = (): void => {
    setSlug("");
    setTitle("");
    setKind("page");
    setLocale(null);
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const nextSlug = kind === "home" ? "home" : slug.trim().toLowerCase();
    createPage.mutate(
      {
        kind,
        slug: nextSlug,
        title: title.trim(),
        locale: targetLocale,
      },
      {
        onSuccess: (page) => {
          toast.success(t("cms.toastPageCreated"));
          setOpen(false);
          reset();
          navigate(`/app/site/pages/${page.id}`);
        },
        onError: () => toast.error(t("cms.toastPageCreateFailed")),
      },
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.createPageTitle")}</SheetTitle>
            <SheetDescription>
              {t("cms.createPageDescription")}
            </SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel>{t("cms.fieldKind")}</FieldLabel>
              <Select
                value={kind}
                onValueChange={(value) => setKind(value as MarketingPageKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">{t("cms.kindHome")}</SelectItem>
                  <SelectItem value="page">{t("cms.kindPage")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {kind !== "home" ? (
              <Field>
                <FieldLabel htmlFor="slug">{t("cms.fieldSlug")}</FieldLabel>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="docs/quickstart"
                  required
                />
                <FieldDescription>{t("cms.slugHintPage")}</FieldDescription>
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="title">{t("cms.fieldTitle")}</FieldLabel>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>
            {/*
              页面按语言分行存：同一个 slug 每种语言各建一页，
              它们靠 (kind, slug) 自动成为一组译文（hreflang / 语言切换器据此生成）。
            */}
            <Field>
              <FieldLabel>{t("cms.fieldLocale")}</FieldLabel>
              <Select
                value={locale ?? defaultLocale}
                onValueChange={(value) => setLocale(value as AppLocale)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {siteLocaleOrder(defaultLocale).map((slug) => (
                    <SelectItem key={slug} value={slug}>
                      {getLocaleNativeLabel(slug)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{t("cms.localeHint")}</FieldDescription>
            </Field>
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("common:cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={createPage.isPending}>
              {createPage.isPending ? <Spinner className="size-4" /> : null}
              {t("cms.create")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
