import { type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSiteMenus } from "./site-menus-context.js";

/**
 * 「用哪个菜单」的控件：下拉选一个 + 一枚直接去改它的按钮。
 *
 * 那枚按钮是这个控件存在的理由。页头设置里选完菜单，下一步必然是「那这个菜单里
 * 都有什么」——没有入口的话租户得自己找到菜单管理在哪、再从一堆菜单里认出刚选的
 * 那个。选中即可编辑，配置链路才是连着的。
 */
export function SiteMenuField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { menus, openManager } = useSiteMenus();
  const known = menus.some((menu) => menu.key === value);

  return (
    <div className="flex gap-2">
      <Select
        disabled={disabled}
        value={known ? value : ""}
        onValueChange={onChange}
      >
        <SelectTrigger id={id} className="flex-1">
          <SelectValue
            placeholder={
              /*
               * 指着一个已删菜单时说清楚是「这个菜单没了」，而不是一句「请选择」
               * ——后者会让人以为从来没配过，于是随便挑一个，原来指的是哪个就永远
               * 查不出来了。
               */
              value && !known
                ? t("editor.menuMissing", { key: value })
                : t("editor.menuPick")
            }
          />
        </SelectTrigger>
        <SelectContent>
          {menus.map((menu) => (
            <SelectItem key={menu.key} value={menu.key}>
              {menuLabel(menu.title) || menu.key}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        title={t("editor.menuManage")}
        onClick={() => openManager(known ? value : undefined)}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  );
}

/** 菜单名可能是多语言表；下拉里取任意一个非空文案即可（这里只是认人用的）。 */
function menuLabel(title: string | { __i18n: Record<string, string> }): string {
  if (typeof title === "string") return title;
  return Object.values(title.__i18n).find((text) => text.trim() !== "") ?? "";
}
