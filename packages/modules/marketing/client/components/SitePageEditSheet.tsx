import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Button } from "@be-water/ui/button";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
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
import { Link } from "react-router";
import { toast } from "sonner";

import { useSiteMutations, useSitePage } from "../hooks/useSite.js";

import type { MarketingPageListItem } from "../../shared/site-cms.js";

interface SitePageEditSheetProps {
  page: MarketingPageListItem;
  children: ReactNode;
}

/** 页面元数据（标题 / SEO）；区块内容与动态菜单走 Theme Editor。 */
export function SitePageEditSheet({ page, children }: SitePageEditSheetProps) {
  const { t } = useTranslation("marketing");
  const { updatePage } = useSiteMutations();
  const [open, setOpen] = useState(false);
  const detail = useSitePage(open ? page.id : undefined);
  const [title, setTitle] = useState(page.title);
  const [description, setDescription] = useState(page.description);

  useEffect(() => {
    if (!detail.data) return;
    setTitle(detail.data.title);
    setDescription(detail.data.description);
  }, [detail.data]);

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    updatePage.mutate(
      {
        pageId: page.id,
        body: {
          title: title.trim(),
          description: description.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success(t("cms.toastPageSaved"));
          setOpen(false);
        },
        onError: () => toast.error(t("cms.toastPageSaveFailed")),
      },
    );
  };

  const isLoading = detail.isLoading && !detail.data;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <form className="flex h-full flex-col" onSubmit={onSubmit}>
          <SheetHeader>
            <SheetTitle>{t("cms.editPageTitle")}</SheetTitle>
            <SheetDescription>{t("cms.editPageDescription")}</SheetDescription>
          </SheetHeader>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : (
            <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
              <Field>
                <FieldLabel htmlFor={`title-${page.id}`}>
                  {t("cms.fieldTitle")}
                </FieldLabel>
                <Input
                  id={`title-${page.id}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`desc-${page.id}`}>
                  {t("cms.fieldDescription")}
                </FieldLabel>
                <Input
                  id={`desc-${page.id}`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
              <Button asChild variant="outline" className="w-full">
                <Link
                  to={`/site/pages/${page.id}`}
                  onClick={() => setOpen(false)}
                >
                  {t("editor.open")}
                </Link>
              </Button>
            </FieldGroup>
          )}

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("common:cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={updatePage.isPending || isLoading}>
              {updatePage.isPending ? <Spinner className="size-4" /> : null}
              {t("cms.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
