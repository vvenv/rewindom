import { useState, type ReactElement } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@be-water/ui/alert-dialog";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  buildPresetSections,
  findPagePreset,
  PAGE_PRESETS,
} from "../../lib/page-presets.js";

import type { SiteSection } from "../../../shared/section-schema.js";

interface PresetMenuProps {
  /** 当前页已有内容时先确认，避免误覆盖 */
  hasContent: boolean;
  onApply: (sections: SiteSection[]) => void;
}

/**
 * 套用页面预设：一键铺出默认官网那套版式（首页 / 定价 / 文档目录 / 文档详情 / 关于 / 联系）。
 * 落地的是普通 section 数据，套完随便改。
 *
 * 放在顶部工具栏而不是区块树里：它整页替换 sections，与「添加区块」不是一档操作，
 * 挨着摆成同样的下拉太容易误点。
 */
export function PresetMenu({
  hasContent,
  onApply,
}: PresetMenuProps): ReactElement {
  const { t } = useTranslation("marketing");
  const [pending, setPending] = useState<string | null>(null);

  const apply = (key: string): void => {
    const preset = findPagePreset(key);
    if (!preset) return;
    onApply(buildPresetSections(preset, t));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            <Wand2 className="size-4" />
            <span className="hidden md:inline">{t("editor.presets")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t("editor.applyPreset")}</DropdownMenuLabel>
          {PAGE_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.key}
              onSelect={() => {
                if (hasContent) setPending(preset.key);
                else apply(preset.key);
              }}
            >
              {t(preset.label)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("editor.presetConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("editor.presetConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending);
                setPending(null);
              }}
            >
              {t("editor.presetConfirmApply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
