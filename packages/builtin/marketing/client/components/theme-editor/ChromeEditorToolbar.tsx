import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Spinner } from "@be-water/ui/spinner";
import { cn } from "@be-water/ui/utils";
import { ArrowLeft, MoreHorizontal, RotateCcw, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ChromeEditorPublishState } from "../../lib/chrome-publish-state.js";

interface ChromeEditorToolbarProps {
  state: ChromeEditorPublishState;
  canWrite: boolean;
  pending: { saving: boolean; publishing: boolean; reverting: boolean };
  onBack: () => void;
  onSave: () => void;
  onPublish: () => void;
  onDiscardLocal: () => void;
  onRevert: () => void;
}

export function ChromeEditorToolbar({
  state,
  canWrite,
  pending,
  onBack,
  onSave,
  onPublish,
  onDiscardLocal,
  onRevert,
}: ChromeEditorToolbarProps) {
  const { t } = useTranslation("marketing");
  const hasRevert = state.canDiscardLocal || state.canRevert;

  return (
    <div className="pointer-events-auto fixed right-4 bottom-4 z-10 flex items-center gap-2 rounded-lg border bg-background p-2 shadow-lg md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      <div className="hidden items-center gap-2 md:flex">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          <span className="hidden lg:inline">{t("editor.back")}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "hidden rounded-full px-2 py-0.5 text-xs font-medium md:inline",
            state.tone === "amber" &&
              "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
            state.tone === "emerald" &&
              "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
            state.tone === "muted" && "bg-muted text-muted-foreground",
          )}
        >
          {t(state.statusKey)}
        </span>

        {canWrite && hasRevert ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label={t("editor.more")}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {state.canDiscardLocal ? (
                <DropdownMenuItem onClick={onDiscardLocal}>
                  <Undo2 className="size-4" />
                  {t("editor.discardLocal")}
                </DropdownMenuItem>
              ) : null}
              {state.canRevert ? (
                <DropdownMenuItem onClick={onRevert}>
                  <RotateCcw className="size-4" />
                  {t("chromeEditor.revert")}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {canWrite && state.canSave ? (
          <Button size="sm" onClick={onSave} disabled={pending.saving}>
            {pending.saving ? <Spinner className="size-4" /> : null}
            {t("editor.saveDraft")}
          </Button>
        ) : null}

        {canWrite && state.canPublish ? (
          <Button
            size="sm"
            variant={state.primary === "publish" ? "default" : "outline"}
            onClick={onPublish}
            disabled={pending.publishing}
            title={
              state.publishBlockedKey
                ? t(state.publishBlockedKey)
                : undefined
            }
          >
            {pending.publishing ? <Spinner className="size-4" /> : null}
            {t("chromeEditor.publish")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
