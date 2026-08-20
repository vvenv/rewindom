import { type ReactNode } from "react";

import { Button } from "@rewindom/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rewindom/ui/dropdown-menu";
import { Spinner } from "@rewindom/ui/spinner";
import { cn } from "@rewindom/ui/utils";
import { MoreHorizontal, RotateCcw, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { EditorPublishState } from "../../lib/editor-publish-state.js";

export interface EditorToolbarPending {
  saving: boolean;
  /** 发布中——「立即发布」的保存那半也算在这里，转圈才不会画到另一枚按钮上。 */
  publishing: boolean;
  reverting: boolean;
}

interface EditorToolbarProps {
  state: EditorPublishState;
  canWrite: boolean;
  pending: EditorToolbarPending;
  /** 发布按钮的文案 key：本页正文是「发布」，站点级区域是「发布页头页脚」。 */
  publishLabelKey: string;
  onSave: () => void;
  onPublish: () => void;
  /** 保存 + 发布一次做完；只在有未保存改动时（`publishSavesFirst`）走这条。 */
  onPublishNow: () => void;
  onDiscardLocal: () => void;
  onRevert: () => void;
  /**
   * 「去哪儿」那一段：换页 / 换语言 / 版本历史，各编辑器自己给。
   *
   * 不替它包 `hidden md:flex`——哪几样在手机上还留着，是内容自己的事
   * （版本历史留着，换页 / 换语言不留）。
   */
  nav?: ReactNode;
  /** 「更多」菜单里排在撤销组**之前** / **之后**的项（复制、取消发布…）。 */
  menuItemsBefore?: ReactNode;
  menuItemsAfter?: ReactNode;
}

/**
 * 两个全屏编辑器共用的工具栏，三段式：**去哪儿**（返回 + `nav`）、**现在什么状态**、
 * **该做什么**（更多 / 保存 / 发布）。
 *
 * 原来页面编辑器与页头页脚编辑器各有一份：容器、返回、保存、发布逐字重复，状态却
 * 长歪了——一个画彩色胶囊、一个画小圆点，撤销项一个带说明一个不带，改一处永远漏另一处。
 * 差异其实只有三处：左边那段导航、「更多」里的额外项、发布按钮的文案，于是收成三个
 * 插槽，其余只此一份。
 *
 * 只有两枚主按钮：保存草稿、发布。发布把这次编辑的东西整个上线——本页正文与站点级的
 * 页头页脚一起（服务端同一事务）。曾经把它们拆成两条发布链，工具栏就长出了第三种
 * 状态、第三个主按钮和第三条撤销，而站长的心智始终只有一个「发过去」。
 *
 * 右边那枚按钮按 `publishSavesFirst` 换语义，而不是再加第三枚：有未保存改动时它是
 * 「立即发布」（保存 + 发布一次点完），否则是「发布」。三件事并排摆不出来——不脏时
 * 「立即发布」与「发布」是同一件事，脏时「只发已保存的草稿」发的是租户看不见的旧版本，
 * 所以无论哪个状态都会有一枚按钮是死的。
 *
 * 主按钮只有一枚：能发布时是发布，发不了时（线上已是最新）谁都不抢重点。不可点的
 * 按钮**留在原位置置灰**（不是藏起来）：`publishBlockedKey` 会在 tooltip 里说明为什么
 * 现在发不了，藏掉的话租户只会觉得功能时有时无。
 */
export function EditorToolbar({
  state,
  canWrite,
  pending,
  publishLabelKey,
  onSave,
  onPublish,
  onPublishNow,
  onDiscardLocal,
  onRevert,
  nav,
  menuItemsBefore,
  menuItemsAfter,
}: EditorToolbarProps) {
  const { t } = useTranslation("marketing");
  const hasRevert = state.canDiscardLocal || state.canRevert;
  const hasMenu = Boolean(menuItemsBefore ?? menuItemsAfter) || hasRevert;

  return (
    // 移动端 `PageLayout` 把 action 放进固定层，所以自己收成右下角悬浮条
    <div className="pointer-events-auto fixed right-4 bottom-4 z-10 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      {nav}

      <EditorStatus state={state} />

      {canWrite ? (
        <>
          {hasMenu ? (
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
                {menuItemsBefore}

                {/*
                  撤销分两级，与状态点说的是同一条链：内存 →(保存) 草稿 →(发布) 线上。
                  每一项只在真有东西可撤时出现，菜单里通常至多一两条。
                */}
                {menuItemsBefore && hasRevert ? (
                  <DropdownMenuSeparator />
                ) : null}
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

                {menuItemsAfter && (hasRevert || menuItemsBefore) ? (
                  <DropdownMenuSeparator />
                ) : null}
                {menuItemsAfter}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* 保存草稿始终是次要动作：便宜、可逆，且「立即发布」已经包含了它 */}
          <Button
            size="sm"
            variant="outline"
            disabled={!state.canSave || pending.saving || pending.publishing}
            title={t("editor.saveHint")}
            onClick={onSave}
          >
            {pending.saving && <Spinner className="size-4" />}
            {t("editor.saveDraft")}
          </Button>

          <Button
            size="sm"
            variant={state.canPublish ? "default" : "outline"}
            disabled={!state.canPublish || pending.publishing || pending.saving}
            title={t(
              state.publishBlockedKey ??
                (state.publishSavesFirst
                  ? "editor.publishNowHint"
                  : "editor.publishHint"),
            )}
            onClick={state.publishSavesFirst ? onPublishNow : onPublish}
          >
            {pending.publishing && <Spinner className="size-4" />}
            {state.publishSavesFirst
              ? t("editor.publishNow")
              : t(publishLabelKey)}
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
