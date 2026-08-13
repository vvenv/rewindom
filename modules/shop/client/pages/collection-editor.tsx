import { type FormEvent } from "react";
import { useParams } from "react-router";

import { FieldInfoTip, PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Spinner } from "@rewindom/ui/spinner";
import { Textarea } from "@rewindom/ui/textarea";
import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiteImageField } from "../../../../packages/builtin/marketing/client/components/media/SiteImageField.js";
import { ProductLocaleBar } from "../components/product-editor/ProductLocaleBar.js";
import { useCollectionEditor } from "../hooks/useCollectionEditor.js";
import { useProducts } from "../hooks/useShop.js";
import { patchLocalized } from "../lib/product-form.js";

export function CollectionEditorPage() {
  const { t } = useTranslation("shop");
  const { collectionId } = useParams<{ collectionId: string }>();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const editor = useCollectionEditor(collectionId);
  const products = useProducts(1, 100);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void editor.submit();
  };

  const toggleProduct = (id: string, checked: boolean): void => {
    const next = checked
      ? [...editor.form.product_ids, id]
      : editor.form.product_ids.filter((item) => item !== id);
    editor.patch({ product_ids: next });
  };

  return (
    <PageLayout
      icon={FolderOpen}
      title={
        editor.isCreate ? t("createCollectionTitle") : t("editCollectionTitle")
      }
      description={
        editor.isCreate
          ? t("createCollectionDescription")
          : t("editCollectionDescription")
      }
      backLink={{ to: "/app/shop/collections", label: t("nav.collections") }}
      action={null}
    >
      {editor.isLoading ? (
        <Spinner className="size-4" />
      ) : (
        <form className="flex max-w-3xl flex-col gap-4" onSubmit={handleSubmit}>
          <ProductLocaleBar
            value={editor.contentLocale}
            onChange={editor.setContentLocale}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t("basicsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="collection-title">
                    {t("fieldTitle")}
                  </FieldLabel>
                  <Input
                    id="collection-title"
                    value={editor.form.title[editor.contentLocale] ?? ""}
                    disabled={!canWrite}
                    onChange={(event) =>
                      editor.patch({
                        title: patchLocalized(
                          editor.form.title,
                          editor.contentLocale,
                          event.target.value,
                        ),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="collection-slug" className="flex items-center gap-1">
                    {t("fieldSlug")}
                    <FieldInfoTip text={t("infoCollectionSlug")} side="left" />
                  </FieldLabel>
                  <Input
                    id="collection-slug"
                    value={editor.form.slug}
                    disabled={!canWrite}
                    onChange={(event) => editor.patch({ slug: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("fieldStatus")}</FieldLabel>
                  <Select
                    value={editor.form.status}
                    disabled={!canWrite}
                    onValueChange={(value) =>
                      editor.patch({
                        status: value === "published" ? "published" : "draft",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t("statusDraft")}</SelectItem>
                      <SelectItem value="published">{t("statusPublished")}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="collection-description">
                    {t("fieldDescription")}
                  </FieldLabel>
                  <Textarea
                    id="collection-description"
                    value={editor.form.description[editor.contentLocale] ?? ""}
                    disabled={!canWrite}
                    onChange={(event) =>
                      editor.patch({
                        description: patchLocalized(
                          editor.form.description,
                          editor.contentLocale,
                          event.target.value,
                        ),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("collectionImage")}</FieldLabel>
                  <SiteImageField
                    id="collection-image"
                    value={editor.form.image_url}
                    disabled={!canWrite}
                    onChange={(url) => editor.patch({ image_url: url })}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("collectionProducts")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-2">
                {(products.data?.items ?? []).map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={editor.form.product_ids.includes(product.id)}
                      disabled={!canWrite}
                      onCheckedChange={(checked) =>
                        toggleProduct(product.id, checked === true)
                      }
                    />
                    {product.title}
                    <span className="text-muted-foreground">{product.slug}</span>
                  </label>
                ))}
                {(products.data?.items ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("empty")}</p>
                ) : null}
              </FieldGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("seoCardTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="collection-seo-title">
                    {t("fieldSeoTitle")}
                  </FieldLabel>
                  <Input
                    id="collection-seo-title"
                    value={editor.form.seo_title[editor.contentLocale] ?? ""}
                    disabled={!canWrite}
                    onChange={(event) =>
                      editor.patch({
                        seo_title: patchLocalized(
                          editor.form.seo_title,
                          editor.contentLocale,
                          event.target.value,
                        ),
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="collection-seo-description">
                    {t("fieldSeoDescription")}
                  </FieldLabel>
                  <Textarea
                    id="collection-seo-description"
                    value={
                      editor.form.seo_description[editor.contentLocale] ?? ""
                    }
                    disabled={!canWrite}
                    onChange={(event) =>
                      editor.patch({
                        seo_description: patchLocalized(
                          editor.form.seo_description,
                          editor.contentLocale,
                          event.target.value,
                        ),
                      })
                    }
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
          {editor.error ? <FieldError>{editor.error}</FieldError> : null}
          {canWrite ? (
            <Button type="submit" disabled={editor.pending} className="self-start">
              {editor.pending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          ) : null}
        </form>
      )}
    </PageLayout>
  );
}
