import { type FormEvent } from "react";
import { useParams } from "react-router";

import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rewindom/ui/card";
import { FieldError } from "@rewindom/ui/field";
import { Spinner } from "@rewindom/ui/spinner";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProductBasicsFields } from "../components/product-editor/ProductBasicsFields.js";
import { ProductLocaleBar } from "../components/product-editor/ProductLocaleBar.js";
import { ProductOptionsFields } from "../components/product-editor/ProductOptionsFields.js";
import { ProductVariantsFields } from "../components/product-editor/ProductVariantsFields.js";
import { useProductEditor } from "../hooks/useProductEditor.js";

export function ProductEditorPage() {
  const { t } = useTranslation("shop");
  const { productId } = useParams<{ productId: string }>();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("shop.write");
  const editor = useProductEditor(productId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void editor.submit();
  };

  return (
    <PageLayout
      icon={Package}
      title={editor.isCreate ? t("createTitle") : t("editTitle")}
      description={
        editor.isCreate ? t("createDescription") : t("editDescription")
      }
      backLink={{ to: "/app/shop", label: t("nav.products") }}
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
              <ProductBasicsFields
                form={editor.form}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.patch}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("optionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductOptionsFields
                options={editor.form.options}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.setOptions}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("variantsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductVariantsFields
                form={editor.form}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.patch}
              />
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
