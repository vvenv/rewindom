import { useState, type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Input } from "@be-water/ui/input";
import { Pencil, Plus, Settings2, Share2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { docCategories } from "../../../shared/marketing-doc.js";
import {
  readLocalizedSetting,
  writeLocalizedSetting,
} from "../../../shared/section-schema.js";
import {
  findSiteMenu,
  MAIN_MENU_KEY,
  type SiteMenu,
  type SiteMenuContext,
} from "../../../shared/site-menu.js";
import {
  addMenu,
  addMenuItem,
  moveMenuItem,
  patchMenuItem,
  removeMenu,
  removeMenuItem,
  reorderMenuItem,
  updateMenu,
  type MenuDropPlace,
} from "../../lib/site-menu-edit.js";

import { useSiteMenus } from "./site-menus-context.js";
import { SiteMenuItemRow, type MenuItemRowDnd } from "./SiteMenuItemRow.js";

import type { AppLocale } from "@be-water/shared";

const ROOT_LIST_ID = "root";

interface MenuDragState {
  id: string;
  listId: string;
}

/**
 * 导航内容的编辑入口：**就地铺开当前菜单的条目**，而不是先选一个菜单再跳去别处改。
 *
 * 这里原本是「一个下拉 + 一枚铅笔」：租户在页头设置里看到的是 `main`（默认菜单没有
 * 名字，回落显示 key），点铅笔弹出一个列着全站所有菜单的面板，再从里面认出刚才那个。
 * 也就是说，改一条页头链接要先理解「菜单」是一种可共享、有 key、页头只是引用它的
 * 东西——而这个概念是实现细节，不是租户想问的问题。租户想问的是「页头上都有什么」。
 *
 * 所以顺序反过来：条目直接在这儿增删排序，「换成另一个菜单 / 新建菜单」降级成右上角
 * 那枚齿轮。共享这件事没有被藏起来——底部那行「同时用于页脚第 1 列」写的就是它，只在
 * **真的**共享时才出现，而不是逼每个租户都先学会它。
 */
export function SiteMenuField({
  id,
  value,
  locale,
  defaultLocale,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  locale: AppLocale;
  defaultLocale: AppLocale;
  disabled?: boolean;
  onChange: (next: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { menus, setMenus, usage, preview } = useSiteMenus();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [drag, setDrag] = useState<MenuDragState | null>(null);
  const [drop, setDrop] = useState<{ id: string; place: MenuDropPlace } | null>(
    null,
  );

  const menu = findSiteMenu(menus, value);
  const previewCtx: SiteMenuContext = { ...preview, locale, defaultLocale };
  const categories = docCategories(preview.docs);

  /**
   * 当前菜单被引用的全部位置。
   *
   * 列**全部**而不是「除我以外的」：这个控件不知道自己是页头那处还是页脚第 2 列
   * 那处（它只拿到一个 key），硬猜的话在页头页脚指着同一个菜单时必然指错一个。
   * 反正只在超过一处时才显示，"用于：页头、页脚 · 链接列 1" 本身就把话说全了。
   */
  const usedAt = usage[value] ?? [];
  const shared = usedAt.length > 1;

  const patch = (update: (current: SiteMenu) => SiteMenu): void => {
    if (!menu) return;
    setMenus(updateMenu(menus, menu.key, update));
  };

  const createMenu = (): void => {
    const next = addMenu(menus, t("editor.menuNewTitle"));
    setMenus(next.menus);
    onChange(next.key);
    setExpandedId(null);
  };

  const deleteMenu = (): void => {
    setMenus(removeMenu(menus, value));
    // 字段不能停在一个不存在的 key 上；主导航恒存在，是唯一安全的落脚点
    onChange(MAIN_MENU_KEY);
    setExpandedId(null);
  };

  const addItem = (parentId: string | null): void => {
    if (!menu) return;
    const next = addMenuItem(menu, parentId);
    setMenus(updateMenu(menus, menu.key, () => next.menu));
    // 新条目一定要填东西，直接展开——否则租户点完「添加链接」只看到多了一个空行
    setExpandedId(next.id);
  };

  const beginDrag = (next: MenuDragState): void => {
    requestAnimationFrame(() => setDrag(next));
  };

  const dndFor = (rowId: string, listId: string): MenuItemRowDnd => ({
    draggable: !disabled,
    dragging: drag?.id === rowId,
    accepts: drag !== null && drag.listId === listId && drag.id !== rowId,
    drop: drop?.id === rowId ? { place: drop.place } : null,
    onDragStart: () => beginDrag({ id: rowId, listId }),
    onDragOver: (place) =>
      setDrop((current) =>
        current?.id === rowId && current.place === place
          ? current
          : { id: rowId, place },
      ),
    onDrop: (place) => {
      if (drag) {
        patch((current) =>
          reorderMenuItem(current, drag.id, rowId, place),
        );
      }
      setDrag(null);
      setDrop(null);
    },
    onDragEnd: () => {
      setDrag(null);
      setDrop(null);
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {renaming && menu ? (
          <Input
            autoFocus
            id={id}
            className="h-7 text-sm"
            disabled={disabled}
            value={readLocalizedSetting(menu.title, locale, defaultLocale)}
            placeholder={t("editor.menuTitle")}
            onBlur={() => setRenaming(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "Escape") {
                setRenaming(false);
              }
            }}
            onChange={(event) =>
              patch((current) => ({
                ...current,
                title: writeLocalizedSetting(
                  current.title,
                  locale,
                  defaultLocale,
                  event.target.value,
                ) as SiteMenu["title"],
              }))
            }
          />
        ) : (
          <span
            id={id}
            className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
          >
            {menuName(menu, value, locale, defaultLocale, t)}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={t("editor.menuSwitch")}
            >
              <Settings2 className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-w-64">
            <DropdownMenuLabel>{t("editor.menuSwitch")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
              {menus.map((entry) => (
                <DropdownMenuRadioItem key={entry.key} value={entry.key}>
                  <span className="truncate">
                    {menuName(entry, entry.key, locale, defaultLocale, t)}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={createMenu}>
              <Plus className="size-4" />
              {t("editor.menuAdd")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!menu}
              onSelect={() => setRenaming(true)}
            >
              <Pencil className="size-4" />
              {t("editor.menuRename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              /*
               * 主导航删不掉（新建站点的页头默认指向它），被两处以上引用的也删不掉
               * ——从页头顺手删掉一个页脚正用着的菜单，坏的是租户此刻看不见的那一块。
               */
              disabled={!menu || value === MAIN_MENU_KEY || shared}
              onSelect={deleteMenu}
            >
              <Trash2 className="size-4" />
              {t("editor.menuRemove")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {menu ? (
        <>
          <div className="flex flex-col gap-1">
            {menu.items.map((item, index) => (
              <div key={item.id} className="flex flex-col gap-1">
                <SiteMenuItemRow
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  locale={locale}
                  defaultLocale={defaultLocale}
                  preview={previewCtx}
                  categories={categories}
                  disabled={disabled}
                  onChange={(next) =>
                    patch((current) => patchMenuItem(current, item.id, next))
                  }
                  onRemove={() =>
                    patch((current) => removeMenuItem(current, item.id))
                  }
                  onMove={(delta) =>
                    patch((current) => moveMenuItem(current, item.id, delta))
                  }
                  canMoveUp={index > 0}
                  canMoveDown={index < menu.items.length - 1}
                  /* 只有静态链接能挂子项：动态项的子项是它自己展开出来的 */
                  onAddChild={
                    item.source === "link"
                      ? () => addItem(item.id)
                      : undefined
                  }
                  dnd={dndFor(item.id, ROOT_LIST_ID)}
                />
                {item.children.map((child, childIndex) => (
                  <SiteMenuItemRow
                    key={child.id}
                    item={child}
                    nested
                    expanded={expandedId === child.id}
                    onToggle={() =>
                      setExpandedId((current) =>
                        current === child.id ? null : child.id,
                      )
                    }
                    locale={locale}
                    defaultLocale={defaultLocale}
                    preview={previewCtx}
                    categories={categories}
                    disabled={disabled}
                    onChange={(next) =>
                      patch((current) => patchMenuItem(current, child.id, next))
                    }
                    onRemove={() =>
                      patch((current) => removeMenuItem(current, child.id))
                    }
                    onMove={(delta) =>
                      patch((current) => moveMenuItem(current, child.id, delta))
                    }
                    canMoveUp={childIndex > 0}
                    canMoveDown={childIndex < item.children.length - 1}
                    dnd={dndFor(child.id, item.id)}
                  />
                ))}
              </div>
            ))}

            {menu.items.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                {t("editor.menuEmpty")}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            disabled={disabled}
            onClick={() => addItem(null)}
          >
            <Plus className="size-4" />
            {t("editor.menuItemAdd")}
          </Button>

          {shared ? (
            <p className="flex items-start gap-1 text-xs text-muted-foreground">
              <Share2 className="mt-0.5 size-3 shrink-0" />
              {t("editor.menuSharedWith", { places: usedAt.join("、") })}
            </p>
          ) : null}
        </>
      ) : (
        /*
         * 指着一个已删菜单：说清楚是「这个菜单没了」，而不是画一份空导航——后者会
         * 让人以为从来没配过，于是重新配一遍，原来指的是哪个就永远查不出来了。
         */
        <p className="text-xs text-destructive">
          {t("editor.menuMissing", { key: value })}
        </p>
      )}
    </div>
  );
}

/** 菜单的显示名；没起名字的主导航叫「主导航」，而不是把 `main` 这个 key 摊给租户看。 */
function menuName(
  menu: SiteMenu | null,
  key: string,
  locale: AppLocale,
  defaultLocale: AppLocale,
  t: (key: string) => string,
): string {
  const title = menu
    ? readLocalizedSetting(menu.title, locale, defaultLocale)
    : "";
  if (title) return title;
  return key === MAIN_MENU_KEY ? t("editor.menuMainName") : key;
}
