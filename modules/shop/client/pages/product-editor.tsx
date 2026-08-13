import { type FormEvent } from "react";
import { useParams } from "react-router";

import { PageLayout, SettingsPanel, SettingsStack, usePermissions } from "@rewindom/module-sdk/client";
import { Button } from "@rewindom/ui/button";
import { FieldError } from "@rewindom/ui/field";
import { Spinner } from "@rewindom/ui/spinner";
import { Package } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProductBasicsFields } from "../components/product-editor/ProductBasicsFields.js";
import { ProductImagesFields } from "../components/product-editor/ProductImagesFields.js";
import { ProductLocaleBar } from "../components/product-editor/ProductLocaleBar.js";
import { ProductOptionsFields } from "../components/product-editor/ProductOptionsFields.js";
import { ProductOrganizationFields } from "../components/product-editor/ProductOrganizationFields.js";
import { ProductSeoFields } from "../components/product-editor/ProductSeoFields.js";
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
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <SettingsStack className="max-w-3xl">
            <ProductLocaleBar
              value={editor.contentLocale}
              onChange={editor.setContentLocale}
            />
            <SettingsPanel title={t("basicsTitle")}>
              <ProductBasicsFields
                form={editor.form}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.patch}
              />
            </SettingsPanel>
            <SettingsPanel title={t("mediaTitle")}>
              <ProductImagesFields
                form={editor.form}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.patch}
              />
            </SettingsPanel>
            <SettingsPanel title={t("optionsTitle")}>
              <ProductOptionsFields
                options={editor.form.options}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.setOptions}
              />
            </SettingsPanel>
            <SettingsPanel title={t("variantsTitle")}>
              <ProductVariantsFields
                form={editor.form}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.patch}
              />
            </SettingsPanel>
            <SettingsPanel title={t("organizationTitle")}>
              <ProductOrganizationFields
                form={editor.form}
                canWrite={canWrite}
                onChange={editor.patch}
              />
            </SettingsPanel>
            <SettingsPanel title={t("seoCardTitle")}>
              <ProductSeoFields
                form={editor.form}
                contentLocale={editor.contentLocale}
                canWrite={canWrite}
                onChange={editor.patch}
              />
              {editor.error ? <FieldError>{editor.error}</FieldError> : null}
            </SettingsPanel>
            {canWrite ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={editor.pending}>
                  {editor.pending ? <Spinner /> : null}
                  {t("save")}
                </Button>
              </div>
            ) : null}
          </SettingsStack>
        </form>
      )}
    </PageLayout>
  );
}
