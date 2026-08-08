import { useEffect, useState, type ReactElement, type ReactNode } from "react";

import { ApiError } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Field, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Textarea } from "@be-water/ui/textarea";
import { toast } from "@be-water/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useCreateSiteDoc,
  useSiteDoc,
  useUpdateSiteDoc,
} from "../hooks/useSiteDocs.js";

import type { MarketingDocListItem } from "../../shared/marketing-doc.js";

interface DocFormState {
  slug: string;
  title: string;
  description: string;
  category: string;
  body_md: string;
  sort_order: number;
}

function emptyForm(): DocFormState {
  return {
    slug: "",
    title: "",
    description: "",
    category: "",
    body_md: "",
    sort_order: 0,
  };
}

/**
 * 文档编辑弹层：create 与 edit 共用。
 *
 * 受控组件——`open` / `onOpenChange` 由父级管理。`doc` 为 null 时是新建，
 * 否则编辑该文档（拉取草稿正文填充表单）。编辑模式下只改草稿列——保存后还需点
 * 「发布」才上线，与页面版式系统同口径。
 */
export function SiteDocEditorSheet({
  open,
  onOpenChange,
  doc,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: MarketingDocListItem | null;
  children?: ReactNode;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const [form, setForm] = useState<DocFormState>(emptyForm());
  const isEdit = Boolean(doc);

  const create = useCreateSiteDoc();
  const update = useUpdateSiteDoc();
  const { data: fullDoc } = useSiteDoc(open && doc ? doc.id : null);

  useEffect(() => {
    if (!open) return;
    if (doc && fullDoc) {
      setForm({
        slug: fullDoc.slug,
        title: fullDoc.title_draft,
        description: fullDoc.description_draft,
        category: fullDoc.category_draft,
        body_md: fullDoc.body_md_draft,
        sort_order: fullDoc.sort_order_draft,
      });
    } else if (!doc) {
      setForm(emptyForm());
    }
  }, [open, doc, fullDoc]);

  const submit = async (): Promise<void> => {
    try {
      if (isEdit && doc) {
        await update.mutateAsync({
          docId: doc.id,
          body: {
            slug: form.slug,
            title: form.title,
            description: form.description,
            category: form.category,
            body_md: form.body_md,
            sort_order: form.sort_order,
          },
        });
        toast.success(t("siteDocs.saved"));
      } else {
        await create.mutateAsync({
          slug: form.slug,
          title: form.title,
          description: form.description,
          category: form.category,
          body_md: form.body_md,
          sort_order: form.sort_order,
        });
        toast.success(t("siteDocs.created"));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t("siteDocs.saveFailed"),
      );
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setForm(emptyForm());
      }}
    >
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      <SheetContent className="w-full sm:max-w-2xl">
        <form
          className="flex h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <SheetHeader>
            <SheetTitle>
              {isEdit ? t("siteDocs.edit") : t("siteDocs.create")}
            </SheetTitle>
            <SheetDescription>{t("siteDocs.createHint")}</SheetDescription>
          </SheetHeader>
          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel htmlFor="doc-slug">{t("siteDocs.slug")}</FieldLabel>
              <Input
                id="doc-slug"
                value={form.slug}
                required
                placeholder="quickstart"
                disabled={isEdit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
              <p className="text-muted-foreground text-xs">
                {t("siteDocs.slugHint")}
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="doc-title">{t("siteDocs.title")}</FieldLabel>
              <Input
                id="doc-title"
                value={form.title}
                required
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="doc-category">
                {t("siteDocs.category")}
              </FieldLabel>
              <Input
                id="doc-category"
                value={form.category}
                placeholder={t("siteDocs.categoryPlaceholder")}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    category: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="doc-description">
                {t("siteDocs.description")}
              </FieldLabel>
              <Input
                id="doc-description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="doc-body">{t("siteDocs.body")}</FieldLabel>
              <Textarea
                id="doc-body"
                value={form.body_md}
                className="min-h-64 font-mono text-sm"
                placeholder="# 标题&#10;&#10;正文..."
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    body_md: event.target.value,
                  }))
                }
              />
              <p className="text-muted-foreground text-xs">
                {t("siteDocs.bodyHint")}
              </p>
            </Field>
          </FieldGroup>
          <SheetFooter>
            <Button
              type="submit"
              disabled={create.isPending || update.isPending}
            >
              {t("cms.save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
