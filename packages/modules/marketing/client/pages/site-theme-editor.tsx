import { PageLayout, usePermissions } from "@be-water/client-kit";
import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Spinner } from "@be-water/ui/spinner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { TenantSiteView } from "../components/TenantSiteView.js";
import { SectionSettingsForm } from "../components/theme-editor/SectionSettingsForm.js";
import { ThemeSettingsForm } from "../components/theme-editor/ThemeSettingsForm.js";
import { useSiteThemeEditor } from "../hooks/use-site-theme-editor.js";
import { SECTION_TYPES } from "../lib/section-schema.js";

import type { SectionType } from "../../shared/theme-sections.js";

export function SiteThemeEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission("site.write");
  const editor = useSiteThemeEditor(pageId);

  if (editor.pageQuery.isLoading || editor.siteQuery.isLoading) {
    return (
      <PageLayout
        icon={Palette}
        title={t("editor.title")}
        description={t("cms.pageDescription")}
      >
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      </PageLayout>
    );
  }

  if (editor.pageQuery.isError || !editor.page || !editor.previewSite) {
    return (
      <PageLayout
        icon={Palette}
        title={t("editor.title")}
        description={t("cms.pageDescription")}
      >
        <p className="text-sm text-destructive">{t("cms.loadFailed")}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/site">
            <ArrowLeft className="size-4" />
            {t("editor.back")}
          </Link>
        </Button>
      </PageLayout>
    );
  }

  const saveAll = (): void => {
    if (!pageId) return;
    editor.mutations.updatePage.mutate(
      {
        pageId,
        body: {
          title: editor.title.trim(),
          description: editor.description.trim(),
          sections: editor.sections,
        },
      },
      {
        onSuccess: () => {
          editor.mutations.updateSite.mutate(
            { theme_settings: editor.themeDraft },
            {
              onSuccess: () => toast.success(t("editor.toastSaved")),
              onError: () => toast.error(t("cms.toastSiteSaveFailed")),
            },
          );
        },
        onError: () => toast.error(t("cms.toastPageSaveFailed")),
      },
    );
  };

  return (
    <PageLayout
      icon={Palette}
      title={t("editor.title")}
      description={editor.title || editor.page.title}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/site">
              <ArrowLeft className="size-4" />
              <span className="hidden md:inline">{t("editor.back")}</span>
            </Link>
          </Button>
          {canWrite ? (
            <>
              {editor.page.status === "published" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    editor.mutations.unpublishPage.mutate(editor.page!.id, {
                      onSuccess: () =>
                        toast.success(t("cms.toastPageUnpublished")),
                      onError: () =>
                        toast.error(t("cms.toastPagePublishFailed")),
                    })
                  }
                >
                  {t("cms.unpublish")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    editor.mutations.publishPage.mutate(editor.page!.id, {
                      onSuccess: () =>
                        toast.success(t("cms.toastPagePublished")),
                      onError: () =>
                        toast.error(t("cms.toastPagePublishFailed")),
                    })
                  }
                >
                  {t("cms.publish")}
                </Button>
              )}
              <Button
                size="sm"
                disabled={
                  editor.mutations.updatePage.isPending ||
                  editor.mutations.updateSite.isPending
                }
                onClick={saveAll}
              >
                {(editor.mutations.updatePage.isPending ||
                  editor.mutations.updateSite.isPending) && (
                  <Spinner className="size-4" />
                )}
                {t("cms.save")}
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <div className="-mx-1 grid min-h-[70vh] gap-3 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{t("editor.sections")}</p>
            <Badge variant="outline">{editor.sections.length}</Badge>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {editor.sections.map((section, index) => (
              <div
                key={section.id}
                className={`flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm ${
                  editor.selectedSectionId === section.id
                    ? "border-primary bg-muted/60"
                    : "border-transparent hover:bg-muted/40"
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => {
                    editor.setSelectedSectionId(section.id);
                    editor.setPanel("section");
                  }}
                >
                  {t(`editor.sectionType.${section.type}`)}
                </button>
                {canWrite ? (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => editor.moveUp(index)}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={index === editor.sections.length - 1}
                      onClick={() => editor.moveDown(index)}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => editor.remove(section.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            {editor.sections.length === 0 ? (
              <p className="px-1 py-4 text-xs text-muted-foreground">
                {t("editor.emptySections")}
              </p>
            ) : null}
          </div>
          {canWrite ? (
            <Select
              key={editor.sections.length}
              onValueChange={(type) => editor.add(type as SectionType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("editor.addSection")} />
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="inline-flex items-center gap-2">
                      <Plus className="size-3.5" />
                      {t(`editor.sectionType.${type}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </aside>

        <div className="overflow-hidden rounded-lg border bg-background">
          <div className="border-b px-3 py-2 text-xs text-muted-foreground">
            {t("editor.preview")} · {editor.path}
          </div>
          <div className="max-h-[calc(70vh-2.5rem)] overflow-y-auto">
            <TenantSiteView
              embedded
              site={editor.previewSite}
              path={editor.path}
              sections={editor.sections}
              title={editor.title}
              description={editor.description}
              selectedSectionId={editor.selectedSectionId}
              onSelectSection={(sectionId) => {
                editor.setSelectedSectionId(sectionId);
                editor.setPanel("section");
              }}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={editor.panel === "section" ? "default" : "outline"}
              className="flex-1"
              onClick={() => editor.setPanel("section")}
            >
              {t("editor.sectionPanel")}
            </Button>
            <Button
              size="sm"
              variant={editor.panel === "theme" ? "default" : "outline"}
              className="flex-1"
              onClick={() => editor.setPanel("theme")}
            >
              {t("editor.themePanel")}
            </Button>
          </div>
          {editor.panel === "theme" ? (
            <ThemeSettingsForm
              value={editor.themeDraft}
              disabled={!canWrite}
              onChange={editor.setThemeDraft}
            />
          ) : editor.selectedSection ? (
            <SectionSettingsForm
              section={editor.selectedSection}
              disabled={!canWrite}
              onChange={(settings) =>
                editor.updateSettings(editor.selectedSection!.id, settings)
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("editor.selectSection")}
            </p>
          )}
        </aside>
      </div>
    </PageLayout>
  );
}
