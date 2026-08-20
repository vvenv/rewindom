import { useState } from "react";

import { getLocaleNativeLabel, type AppLocale } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import { ButtonGroup } from "@rewindom/ui/button-group";
import { DropdownMenuItem } from "@rewindom/ui/dropdown-menu";
import { CloudOff, Copy, LayoutTemplate } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getPageTemplatePreset } from "../../../shared/page-templates.js";
import { SitePageDuplicateSheet } from "../SitePageDuplicateSheet.js";

import { EditorToolbar, type EditorToolbarPending } from "./EditorToolbar.js";
import { PageSwitcher } from "./PageSwitcher.js";
import { PageVersionsSheet } from "./PageVersionsSheet.js";

import type {
  MarketingPage,
  MarketingPageListItem,
} from "../../../shared/site-cms.js";
import type { EditorPublishState } from "../../lib/editor-publish-state.js";

interface LocaleVariant {
  locale: AppLocale;
  pageId: string | null;
}

interface PageEditorToolbarProps {
  page: MarketingPage;
  /** 标题取草稿值，改了还没存也跟得上。 */
  currentTitle: string;
  localePages: MarketingPageListItem[];
  localeVariants: LocaleVariant[];
  locale: AppLocale;
  state: EditorPublishState;
  canWrite: boolean;
  pending: EditorToolbarPending;
  onGoToPage: (pageId: string) => void;
  onDuplicated: (page: MarketingPage) => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDiscardLocal: () => void;
  onRevert: () => void;
  /** 有内置版式的 kind 才传；点了之后由页面去确认并调 reset-preset。 */
  onResetPreset?: () => void;
  resetPresetPending?: boolean;
}

/**
 * Theme Editor 的工具栏 = 共用的 `EditorToolbar` + 本页特有的三样东西：
 * 换页 / 换语言 / 版本历史（导航段）、复制 / 重设版式 / 取消发布（「更多」里的额外项）。
 *
 * 复制那张 Sheet 挂在工具栏外面：菜单项当不了 `SheetTrigger`（一点菜单就关），
 * 而菜单内容在关闭时会卸载，Sheet 跟着一起没了。
 *
 * 「重设版式」只对有内置预设的 kind 出现（首页 / 模板页），和列表行同一条接口。
 * 图标不用 RotateCcw——撤销草稿已经占了那个，免得两项长得一样。
 */
export function PageEditorToolbar({
  page,
  currentTitle,
  localePages,
  localeVariants,
  locale,
  state,
  canWrite,
  pending,
  onGoToPage,
  onDuplicated,
  onSave,
  onPublish,
  onUnpublish,
  onDiscardLocal,
  onRevert,
  onResetPreset,
  resetPresetPending = false,
}: PageEditorToolbarProps) {
  const { t } = useTranslation("marketing");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const canResetPreset = Boolean(getPageTemplatePreset(page.kind) && onResetPreset);

  return (
    <>
      <EditorToolbar
        state={state}
        canWrite={canWrite}
        pending={pending}
        publishLabelKey="cms.publish"
        onSave={onSave}
        onPublish={onPublish}
        onDiscardLocal={onDiscardLocal}
        onRevert={onRevert}
        nav={
          <>
            {/* 换页 / 换语言在手机上收起来：悬浮条只留状态与两枚主按钮 */}
            <div className="hidden items-center gap-2 md:flex">
              {/* 同语言下的其它页面：改完一页直接切下一页，不用退回列表 */}
              <PageSwitcher
                pages={localePages}
                currentPageId={page.id}
                currentTitle={currentTitle}
                onSelect={onGoToPage}
              />

              {/*
                切语言 = 切到同 slug 的**另一行页面**（页面按语言分行存），所以是导航
                而不是本地状态。还没建那一行时置灰，提示去页面列表新建。
              */}
              {localeVariants.length > 1 ? (
                <ButtonGroup>
                  {localeVariants.map((variant) => {
                    const active = variant.locale === locale;
                    return (
                      <Button
                        key={variant.locale}
                        size="sm"
                        variant={active ? "secondary" : "outline"}
                        aria-pressed={active}
                        disabled={variant.pageId === null}
                        title={
                          variant.pageId === null
                            ? t("editor.locale.missing")
                            : getLocaleNativeLabel(variant.locale)
                        }
                        onClick={() => {
                          if (variant.pageId) onGoToPage(variant.pageId);
                        }}
                      >
                        {getLocaleNativeLabel(variant.locale)}
                      </Button>
                    );
                  })}
                </ButtonGroup>
              ) : null}
            </div>

            {/* 版本历史与「撤销」是两回事：撤销只退到最近一次发布，这里能挑任意一版 */}
            <PageVersionsSheet pageId={page.id} />
          </>
        }
        menuItemsBefore={
          <>
            <DropdownMenuItem onSelect={() => setDuplicateOpen(true)}>
              <Copy className="size-4" />
              {t("cms.duplicate")}
            </DropdownMenuItem>
            {canResetPreset ? (
              <DropdownMenuItem
                disabled={resetPresetPending}
                onSelect={() => onResetPreset?.()}
              >
                <LayoutTemplate className="size-4" />
                {t("cms.resetPreset")}
              </DropdownMenuItem>
            ) : null}
          </>
        }
        menuItemsAfter={
          page.status === "published" ? (
            <DropdownMenuItem variant="destructive" onSelect={onUnpublish}>
              <CloudOff className="size-4" />
              {t("cms.unpublish")}
            </DropdownMenuItem>
          ) : null
        }
      />

      <SitePageDuplicateSheet
        page={page}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        onDuplicated={onDuplicated}
      />
    </>
  );
}
