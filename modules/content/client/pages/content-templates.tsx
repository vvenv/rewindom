import { PageLayout, usePermissions } from "@rewindom/module-sdk/client";
import { Alert, AlertDescription } from "@rewindom/ui/alert";
import { Badge } from "@rewindom/ui/badge";
import { Button } from "@rewindom/ui/button";
import { Spinner } from "@rewindom/ui/spinner";
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ContentTemplateEditorSheet } from "../components/ContentTemplateEditorSheet.js";
import { useContentTemplatesPage } from "../hooks/useContentTemplatesPage.js";

export function ContentTemplates() {
  const { t } = useTranslation("content");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("contents.write");
  const page = useContentTemplatesPage();

  return (
    <PageLayout
      icon={ClipboardList}
      title={t("template.pageTitle")}
      description={t("template.pageDescription")}
      action={
        canWrite ? (
          <Button
            type="button"
            disabled={page.busy}
            onClick={() => page.openEditor(null)}
          >
            <Plus className="size-4" />
            {t("template.create")}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/contents">
              <ArrowLeft className="size-4" />
              {t("backToList")}
            </Link>
          </Button>
        </div>

        {page.isError ? (
          <Alert>
            <AlertDescription>{t("loadFailed")}</AlertDescription>
          </Alert>
        ) : null}

        {page.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="size-6" />
          </div>
        ) : page.templates.length === 0 ? (
          <div className="text-muted-foreground flex flex-col gap-1 py-6 text-sm">
            <span>{t("template.empty")}</span>
            <span>{t("template.emptyHint")}</span>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {page.templates.map((template) => (
              <li
                key={template.id}
                className="border-border flex flex-wrap items-center gap-3 rounded-md border p-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    <Badge variant="secondary">
                      {t(`format.${template.format}`)}
                    </Badge>
                    <Badge variant="outline">
                      {t("template.fieldCount", {
                        count: template.field_count,
                      })}
                    </Badge>
                  </div>
                  {template.description ? (
                    <span className="text-muted-foreground text-sm">
                      {template.description}
                    </span>
                  ) : null}
                </div>
                {canWrite ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page.busy}
                      onClick={() => page.openEditor(template.id)}
                    >
                      <Pencil className="size-4" />
                      {t("template.edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("template.delete")}
                      disabled={page.busy}
                      onClick={() => void page.handleDelete(template)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canWrite && page.presets.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium">
                {t("template.presetsTitle")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t("template.presetsHint")}
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {page.presets.map((preset) => (
                <li
                  key={preset.key}
                  className="border-border flex flex-col gap-2 rounded-md border p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{preset.name}</span>
                    <Badge variant="secondary">
                      {t(`format.${preset.format}`)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground flex-1 text-sm">
                    {preset.description}
                  </p>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page.busy}
                      onClick={() => void page.handleCopyPreset(preset.key)}
                    >
                      <Copy className="size-4" />
                      {t("template.copyPreset")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <ContentTemplateEditorSheet
        templateId={page.editingId}
        open={page.editorOpen}
        onOpenChange={page.setEditorOpen}
      />
    </PageLayout>
  );
}
