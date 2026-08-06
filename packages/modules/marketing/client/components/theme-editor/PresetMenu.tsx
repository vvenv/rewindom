import { type ReactElement } from "react";

import { useConfirm } from "@be-water/client-kit";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@be-water/ui/dropdown-menu";
import { Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  buildPresetSections,
  findPagePreset,
  PAGE_PRESETS,
} from "../../lib/page-presets.js";

import type { SiteSection } from "../../../shared/section-schema.js";

interface PresetMenuItemsProps {
  /** 当前页已有内容时先确认，避免误覆盖。 */
  hasContent: boolean;
  onApply: (sections: SiteSection[]) => void;
}

/**
 * 套用页面预设：一键铺出默认官网那套版式（首页 / 定价 / 文档目录 / 文档详情 / 关于 / 联系）。
 * 落地的是普通 section 数据，套完随便改。
 *
 * 收在工具栏「更多」菜单里的二级菜单——它整页替换 sections，与「添加区块」不是
 * 一档操作，摆在外面容易误点。覆盖确认走 `ConfirmProvider` 而不是本地
 * `AlertDialog`：菜单一关这棵子树就卸载了，自带的弹窗会跟着消失。
 */
export function PresetMenuItems({
  hasContent,
  onApply,
}: PresetMenuItemsProps): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();

  const pick = async (key: string): Promise<void> => {
    const preset = findPagePreset(key);
    if (!preset) return;
    if (hasContent) {
      const confirmed = await confirm({
        title: t("editor.presetConfirmTitle"),
        description: t("editor.presetConfirmBody"),
        confirmText: t("editor.presetConfirmApply"),
        destructive: true,
      });
      if (!confirmed) return;
    }
    onApply(buildPresetSections(preset, t));
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Wand2 className="size-4" />
        {t("editor.applyPreset")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        {PAGE_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.key}
            onSelect={() => void pick(preset.key)}
          >
            {t(preset.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
