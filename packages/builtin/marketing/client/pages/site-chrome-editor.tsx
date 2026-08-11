import { useEffect, useState } from "react";

import { PageLayout, useConfirm, usePermissions } from "@be-water/client-kit";
import { getLocaleNativeLabel } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { ButtonGroup } from "@be-water/ui/button-group";
import { Spinner } from "@be-water/ui/spinner";
import {
  ArrowLeft,
  LayoutTemplate,
  Monitor,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import {
  getSectionDefinition,
  type SiteSection,
} from "../../shared/section-schema.js";
import { settingNavItems } from "../../shared/site-nav.js";
import { TenantSiteView } from "../components/TenantSiteView.js";
import { ChromeEditorToolbar } from "../components/theme-editor/ChromeEditorToolbar.js";
import {
  PreviewFrame,
  type PreviewDevice,
} from "../components/theme-editor/PreviewFrame.js";
import { SectionSettingsForm } from "../components/theme-editor/SectionSettingsForm.js";
import { SectionTree } from "../components/theme-editor/SectionTree.js";
import { SiteNavPreviewProvider } from "../components/theme-editor/site-nav-preview-context.js";
import { SiteAccountEntryPreview } from "../components/theme-editor/SiteAccountEntryPreview.js";
import { useChromeDocs } from "../hooks/use-chrome-docs.js";
import { useSiteChromeEditor } from "../hooks/use-site-chrome-editor.js";
import { resolveChromePublishState } from "../lib/chrome-publish-state.js";
import { sectionTypeLabel } from "../lib/section-type-label.js";
import { siteMemberEntrySlot } from "../shell/site-member-slots.js";

const DEVICE_ICONS: Array<[PreviewDevice, LucideIcon]> = [
  ["desktop", Monitor],
  ["tablet", Tablet],
  ["mobile", Smartphone],
];

function selectionTypeLabel(
  section: SiteSection,
  blockId: string | null,
  t: (key: string) => string,
): string {
  const sectionLabel = sectionTypeLabel(t, section.type);
  if (!blockId) return sectionLabel;
  const block = section.blocks.find((item) => item.id === blockId);
  const blockDef = getSectionDefinition(section.type)?.blocks?.find(
    (item) => item.type === block?.type,
  );
  return blockDef ? t(blockDef.label) : (block?.type ?? sectionLabel);
}

export function SiteChromeEditor() {
  const navigate = useNavigate();
  const { t } = useTranslation("marketing");
  const { hasPermission } = usePermissions();
  const { confirm } = useConfirm();
  const canWrite = hasPermission("site.write");
  const editor = useSiteChromeEditor();
  const chromeDocs = useChromeDocs(
    { header: editor.header, footer: editor.footer },
    editor.locale,
    editor.defaultLocale,
  );
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const { selectedSectionId, selectedBlockId } = editor;
  const headerIds = editor.header.map((section) => section.id).join(",");

  useEffect(() => {
    if (!previewDoc || !selectedSectionId) return;
    if (headerIds.split(",").includes(selectedSectionId)) {
      previewDoc.defaultView?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const selector = selectedBlockId
      ? `[data-block-id="${CSS.escape(selectedBlockId)}"]`
      : `[data-section-id="${CSS.escape(selectedSectionId)}"]`;
    previewDoc
      .querySelector(selector)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [previewDoc, selectedSectionId, selectedBlockId, headerIds]);

  if (editor.siteQuery.isLoading) {
    return (
      <PageLayout
        icon={LayoutTemplate}
        title={t("chromeEditor.title")}
        description={t("chromeEditor.pageDescription")}
      >
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      </PageLayout>
    );
  }

  if (editor.siteQuery.isError || !editor.previewSite) {
    return (
      <PageLayout
        icon={LayoutTemplate}
        title={t("chromeEditor.title")}
        description={t("chromeEditor.pageDescription")}
      >
        <p className="text-sm text-destructive">{t("cms.loadFailed")}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/site">
            <ArrowLeft className="size-4" />
            {t("editor.back")}
          </Link>
        </Button>
      </PageLayout>
    );
  }

  const selectedSection = editor.selectedSection;
  const highlightLabel = selectedSection
    ? selectionTypeLabel(selectedSection, editor.selectedBlockId, t)
    : undefined;
  const saving = editor.mutations.saveChromeDraft.isPending;
  const publishing = editor.mutations.publishChrome.isPending;
  const reverting = editor.mutations.revertChrome.isPending;
  const publishState = resolveChromePublishState({
    dirty: editor.dirty,
    chromeDirty: editor.chromeDirty,
  });
  const accountEntryAvailable = editor.capabilities.account_entry;

  const leaveTo = async (to: string): Promise<void> => {
    if (editor.dirty) {
      const confirmed = await confirm({
        title: t("editor.leaveConfirmTitle"),
        description: t("editor.leaveConfirmBody"),
        confirmText: t("editor.leaveConfirmAction"),
        destructive: true,
      });
      if (!confirmed) return;
    }
    void navigate(to);
  };

  const save = (): void => {
    editor.mutations.saveChromeDraft.mutate(
      { header: editor.header, footer: editor.footer },
      {
        onSuccess: () => toast.success(t("chromeEditor.toastSaved")),
        onError: () => toast.error(t("chromeEditor.toastSaveFailed")),
      },
    );
  };

  const publish = (): void => {
    editor.mutations.publishChrome.mutate(undefined, {
      onSuccess: () => toast.success(t("chromeEditor.toastPublished")),
      onError: () => toast.error(t("chromeEditor.toastPublishFailed")),
    });
  };

  const discardLocal = async (): Promise<void> => {
    const confirmed = await confirm({
      title: t("editor.discardLocalConfirmTitle"),
      description: t("editor.discardLocalConfirmBody"),
      confirmText: t("editor.discardLocalConfirmAction"),
      destructive: true,
    });
    if (!confirmed) return;
    editor.discardLocalChanges();
    toast.success(t("editor.toastLocalDiscarded"));
  };

  const revert = async (): Promise<void> => {
    const body = t("chromeEditor.revertConfirmBody");
    const confirmed = await confirm({
      title: t("chromeEditor.revertConfirmTitle"),
      description: editor.dirty
        ? `${body}${t("editor.revertDiscardsUnsavedToo")}`
        : body,
      confirmText: t("editor.revertConfirmAction"),
      destructive: true,
    });
    if (!confirmed) return;
    editor.mutations.revertChrome.mutate(undefined, {
      onSuccess: () => {
        editor.discardLocalChanges();
        toast.success(t("chromeEditor.toastReverted"));
      },
      onError: () => toast.error(t("chromeEditor.toastRevertFailed")),
    });
  };

  const previewView = (
    <TenantSiteView
      embedded
      site={editor.previewSite}
      path="/"
      sections={[]}
      alternates={editor.previewAlternates}
      headerOverride={editor.header}
      footerOverride={editor.footer}
      chromeDocs={chromeDocs}
      onSelectSection={(sectionId, blockId) =>
        editor.selectSection(sectionId, blockId)
      }
    />
  );

  return (
    <SiteNavPreviewProvider
      value={{
        navPages: (editor.previewSite?.pages ?? []).map((page) => ({
          path: page.path,
          title: page.title,
        })),
        docs: chromeDocs,
        headerItems: settingNavItems(editor.header[0]?.settings ?? {}),
      }}
    >
      <PageLayout
        icon={LayoutTemplate}
        title={t("chromeEditor.title")}
        description={t("chromeEditor.pageDescription")}
        fill
        action={
          <ChromeEditorToolbar
            state={publishState}
            canWrite={canWrite}
            pending={{ saving, publishing, reverting }}
            onBack={() => void leaveTo("/app/site")}
            onSave={save}
            onPublish={publish}
            onDiscardLocal={() => void discardLocal()}
            onRevert={() => void revert()}
          />
        }
      >
        <div className="-mx-1 grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs text-muted-foreground">
                {t("chromeEditor.editLocale")}
              </span>
              <ButtonGroup>
                {editor.locales.map((slug) => (
                  <Button
                    key={slug}
                    type="button"
                    size="sm"
                    variant={slug === editor.locale ? "secondary" : "outline"}
                    onClick={() => editor.setLocale(slug)}
                  >
                    {getLocaleNativeLabel(slug)}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
            <SectionTree
              chromeOnly
              entitlements={editor.capabilities.entitlements}
              sections={[]}
              header={editor.header}
              footer={editor.footer}
              selectedSectionId={editor.selectedSectionId}
              selectedBlockId={editor.selectedBlockId}
              metaSelected={false}
              canWrite={canWrite}
              onSelect={(sectionId, blockId) =>
                editor.selectSection(sectionId, blockId)
              }
              onSelectMeta={() => undefined}
              onAddSection={editor.addSection}
              onRemoveSection={editor.removeSection}
              onMoveSection={editor.moveSection}
              onMoveSectionTo={editor.moveSectionTo}
              onAddBlock={editor.addBlock}
              onRemoveBlock={editor.removeBlock}
              onMoveBlock={editor.moveBlock}
              onReorderBlock={editor.reorderBlock}
            />
          </div>

          <div className="flex h-[70vh] flex-col overflow-hidden rounded-lg border bg-background lg:h-full">
            <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
              <span className="truncate">{t("chromeEditor.preview")}</span>
              <ButtonGroup className="ml-auto">
                {DEVICE_ICONS.map(([key, Icon]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={device === key ? "secondary" : "outline"}
                    aria-pressed={device === key}
                    title={t(`editor.device.${key}`)}
                    className="size-7"
                    onClick={() => setDevice(key)}
                  >
                    <Icon className="size-3.5" />
                    <span className="sr-only">
                      {t(`editor.device.${key}`)}
                    </span>
                  </Button>
                ))}
              </ButtonGroup>
            </div>
            <PreviewFrame
              device={device}
              onDocumentChange={setPreviewDoc}
              highlightSectionId={editor.selectedSectionId}
              highlightBlockId={editor.selectedBlockId}
              highlightLabel={highlightLabel}
            >
              {accountEntryAvailable ? (
                <siteMemberEntrySlot.Provider component={SiteAccountEntryPreview}>
                  {previewView}
                </siteMemberEntrySlot.Provider>
              ) : (
                previewView
              )}
            </PreviewFrame>
          </div>

          <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
            {selectedSection ? (
              <SectionSettingsForm
                section={selectedSection}
                blockId={editor.selectedBlockId}
                disabled={!canWrite}
                unavailable={
                  accountEntryAvailable
                    ? undefined
                    : { show_account: t("editor.accountEntryUnavailable") }
                }
                locale={editor.locale}
                defaultLocale={editor.defaultLocale}
                onChangeSettings={(settings) =>
                  editor.updateSettings(selectedSection.id, settings)
                }
                onChangeBlockSettings={(blockId, settings) =>
                  editor.updateBlockSettings(
                    selectedSection.id,
                    blockId,
                    settings,
                  )
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
    </SiteNavPreviewProvider>
  );
}
