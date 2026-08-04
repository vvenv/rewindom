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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
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
 * 套用页面预设：一键铺出默认官网那套版式（首页 / 定价 / 文档 / 关于 / 联系）。
 * 落地的是普通 section 数据，套完随便改。
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
      <Select
        key={pending ?? "preset"}
        onValueChange={(key) => {
          if (hasContent) setPending(key);
          else apply(key);
        }}
      >
        <SelectTrigger className="mt-1 w-full" size="sm">
          <SelectValue placeholder={t("editor.applyPreset")} />
        </SelectTrigger>
        <SelectContent>
          {PAGE_PRESETS.map((preset) => (
            <SelectItem key={preset.key} value={preset.key}>
              <span className="inline-flex items-center gap-2">
                <Wand2 className="size-3.5" />
                {t(preset.label)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
