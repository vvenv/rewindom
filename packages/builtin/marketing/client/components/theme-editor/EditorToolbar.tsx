import { useState } from "react";

import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { ButtonGroup } from "@be-water/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import {
  ArrowLeft,
  CloudOff,
  Copy,
  MoreHorizontal,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { SitePageDuplicateSheet } from "../SitePageDuplicateSheet.js";

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

interface EditorToolbarProps {
  page: MarketingPage;
  /** 标题取草稿值，改了还没存也跟得上。 */
  currentTitle: string;
  localePages: MarketingPageListItem[];
  localeVariants: LocaleVariant[];
  locale: AppLocale;
  state: EditorPublishState;
  canWrite: boolean;
  pending: { saving: boolean; publishing: boolean; reverting: boolean };
  onBack: () => void;
  onGoToPage: (pageId: string) => void;
  onDuplicated: (page: MarketingPage) => void;
  onSave: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onDiscardLocal: () => void;
  onRevert: () => void;
}

/**
 * 编辑器顶部工具栏，三段式：**去哪儿**（返回 / 换页 / 换语言）、**现在什么状态**、
 * **该做什么**（更多 / 保存 / 发布）。
 *
 * 只有两枚主按钮：保存、发布。发布把这次编辑的东西整个上线——本页正文与站点级的
 * 页头页脚一起（服务端同一事务）。曾经把它们拆成两条发布链，工具栏就长出了第三种
 * 状态、第三个主按钮和第三条撤销，而站长的心智始终只有一个「发过去」。
 *
 * 低频动作（复制、撤销、取消发布）收进「更多」；同一时刻只有一枚 primary，
 * 由 `EditorPublishState` 决定，工具栏因此永远只有一个重点。
 */
export function EditorToolbar({
  page,
  currentTitle,
  localePages,
  localeVariants,
  locale,
  state,
  canWrite,
  pending,
  onBack,
  onGoToPage,
  onDuplicated,
  onSave,
  onPublish,
  onUnpublish,
  onDiscardLocal,
  onRevert,
}: EditorToolbarProps) {
  const { t } = useTranslation("marketing");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const published = page.status === "published";
  const hasRevert = state.canDiscardLocal || state.canRevert;

  return (
    // 移动端 `PageLayout` 把 action 放进固定层，所以自己收成右下角悬浮条
    <div className="pointer-events-auto fixed right-4 bottom-4 z-10 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      <div className="hidden items-center gap-2 md:flex">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          <span className="hidden lg:inline">{t("editor.back")}</span>
        </Button>

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

      <EditorStatus state={state} />

      {canWrite ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                title={t("editor.more")}
                aria-label={t("editor.more")}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem onSelect={() => setDuplicateOpen(true)}>
                <Copy className="size-4" />
                {t("cms.duplicate")}
              </DropdownMenuItem>
              {/*
                撤销分两级，与状态点说的是同一条链：内存 →(保存) 草稿 →(发布) 线上。
                每一项只在真有东西可撤时出现，菜单里通常至多一两条。
              */}
              {hasRevert ? <DropdownMenuSeparator /> : null}
              {state.canDiscardLocal ? (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={onDiscardLocal}
                >
                  <Undo2 className="size-4" />
                  <span className="flex min-w-0 flex-col">
                    <span>{t("editor.discardLocal")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("editor.discardLocalHint")}
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : null}
              {state.canRevert ? (
                <DropdownMenuItem
                  variant="destructive"
                  disabled={pending.reverting}
                  onSelect={onRevert}
                >
                  <RotateCcw className="size-4" />
                  <span className="flex min-w-0 flex-col">
                    <span>{t("editor.revert")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("editor.revertHint")}
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : null}

              {published ? <DropdownMenuSeparator /> : null}
              {published ? (
                <DropdownMenuItem variant="destructive" onSelect={onUnpublish}>
                  <CloudOff className="size-4" />
                  {t("cms.unpublish")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 菜单项当不了 SheetTrigger（一点菜单就关），所以受控地挂在外面 */}
          <SitePageDuplicateSheet
            page={page}
            open={duplicateOpen}
            onOpenChange={setDuplicateOpen}
            onDuplicated={onDuplicated}
          />

          <Button
            size="sm"
            variant={state.primary === "save" ? "default" : "outline"}
            disabled={!state.canSave || pending.saving}
            title={t("editor.saveHint")}
            onClick={onSave}
          >
            {pending.saving && <Spinner className="size-4" />}
            {t("editor.saveDraft")}
          </Button>

          <Button
            size="sm"
            variant={state.primary === "publish" ? "default" : "outline"}
            disabled={!state.canPublish || pending.publishing}
            title={t(state.publishBlockedKey ?? "editor.publishHint")}
            onClick={onPublish}
          >
            {pending.publishing && <Spinner className="size-4" />}
            {t("cms.publish")}
          </Button>
        </>
      ) : null}
    </div>
  );
}

const TONE_DOT = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  muted: "bg-muted-foreground/40",
} as const;

/**
 * 「编辑器 →(保存) 草稿 →(发布) 线上」这条链现在走到哪儿了。
 * 保存与发布的区别，说到底要靠这句话解释，光靠按钮文案说不清。
 */
function EditorStatus({ state }: { state: EditorPublishState }) {
  const { t } = useTranslation("marketing");

  return (
    <span className="flex items-center gap-1.5 px-1 md:mr-1">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[state.tone])}
      />
      <span className="text-xs whitespace-nowrap text-muted-foreground sr-only lg:not-sr-only">
        {t(state.statusKey)}
      </span>
    </span>
  );
}
