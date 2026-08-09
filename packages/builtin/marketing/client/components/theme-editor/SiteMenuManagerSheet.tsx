import { type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Separator } from "@be-water/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@be-water/ui/sheet";
import { ChevronDown, ChevronUp, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { readLocalizedSetting, writeLocalizedSetting } from "../../../shared/section-schema.js";
import {
  createMenuItemId,
  MAIN_MENU_KEY,
  menuKeyFromTitle,
  SITE_MENU_SOURCES,
  type SiteMenu,
  type SiteMenuItem,
  type SiteMenuSource,
} from "../../../shared/site-menu.js";

import { SiteLinkField } from "./SiteLinkField.js";

import type { AppLocale } from "@be-water/shared";

/**
 * 菜单管理面板：站点全部导航菜单的唯一配置入口。
 *
 * 页头选一个菜单、页脚每一列各选一个，链接本身只在这里编辑——「同一批链接要在两个
 * 地方各配一遍」正是这次整合要消掉的东西。
 *
 * 做成 Sheet 而不是独立页面：改导航几乎总是发生在**看着页头页脚**的时候，跳走一趟
 * 再回来会丢掉编辑器里其它未保存的改动（草稿是一整份，见 `use-site-theme-editor`）。
 */
export function SiteMenuManagerSheet({
  open,
  onOpenChange,
  menus,
  onChange,
  locale,
  defaultLocale,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menus: SiteMenu[];
  onChange: (next: SiteMenu[]) => void;
  /** 正在编辑的语言：菜单文案与 section 文案同一套逐语言槽位。 */
  locale: AppLocale;
  defaultLocale: AppLocale;
  disabled?: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");

  const patchMenu = (key: string, patch: Partial<SiteMenu>): void => {
    onChange(
      menus.map((menu) => (menu.key === key ? { ...menu, ...patch } : menu)),
    );
  };

  const addMenu = (): void => {
    const title = t("editor.menuNewTitle");
    onChange([
      ...menus,
      {
        key: menuKeyFromTitle(
          title,
          menus.map((menu) => menu.key),
        ),
        title,
        items: [],
      },
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("editor.menuManage")}</SheetTitle>
          <SheetDescription>{t("editor.menuManageHint")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          {menus.map((menu) => (
            <MenuEditor
              key={menu.key}
              menu={menu}
              locale={locale}
              defaultLocale={defaultLocale}
              disabled={disabled}
              onChange={(patch) => patchMenu(menu.key, patch)}
              onRemove={
                /*
                 * `main` 删不掉：页头的 `menu` 设置默认指向它，删了之后新建的站点
                 * 一进来就是一个指向不存在菜单的页头。要清空就把里面的条目删光。
                 */
                menu.key === MAIN_MENU_KEY
                  ? undefined
                  : () =>
                      onChange(menus.filter((item) => item.key !== menu.key))
              }
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={addMenu}
          >
            <Plus className="size-4" />
            {t("editor.menuAdd")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuEditor({
  menu,
  locale,
  defaultLocale,
  disabled,
  onChange,
  onRemove,
}: {
  menu: SiteMenu;
  locale: AppLocale;
  defaultLocale: AppLocale;
  disabled?: boolean;
  onChange: (patch: Partial<SiteMenu>) => void;
  /** 不传表示这个菜单不允许删除。 */
  onRemove?: () => void;
}): ReactElement {
  const { t } = useTranslation("marketing");

  const setItems = (items: SiteMenuItem[]): void => onChange({ items });

  const patchItem = (id: string, patch: Partial<SiteMenuItem>): void => {
    setItems(
      menu.items.map((item) =>
        item.id === id
          ? { ...item, ...patch }
          : {
              ...item,
              children: item.children.map((child) =>
                child.id === id ? { ...child, ...patch } : child,
              ),
            },
      ),
    );
  };

  const removeItem = (id: string): void => {
    setItems(
      menu.items
        .filter((item) => item.id !== id)
        .map((item) => ({
          ...item,
          children: item.children.filter((child) => child.id !== id),
        })),
    );
  };

  const moveItem = (index: number, delta: number): void => {
    const next = [...menu.items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setItems(next);
  };

  const addItem = (): void => setItems([...menu.items, blankItem()]);

  const addChild = (parentId: string): void => {
    setItems(
      menu.items.map((item) =>
        item.id === parentId
          ? { ...item, children: [...item.children, blankItem()] }
          : item,
      ),
    );
  };

  return (
    <div className="rounded-lg border p-3">
      <FieldGroup className="gap-3">
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`menu-title-${menu.key}`} className="shrink-0">
            {t("editor.menuTitle")}
          </FieldLabel>
          <Input
            id={`menu-title-${menu.key}`}
            disabled={disabled}
            value={readLocalizedSetting(menu.title, locale, defaultLocale)}
            placeholder={menu.key}
            onChange={(event) =>
              onChange({
                title: writeLocalizedSetting(
                  menu.title,
                  locale,
                  defaultLocale,
                  event.target.value,
                ) as SiteMenu["title"],
              })
            }
          />
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              title={t("editor.menuRemove")}
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </Field>
        <FieldDescription>
          {t("editor.menuTitleHint", { key: menu.key })}
        </FieldDescription>
      </FieldGroup>

      <Separator className="my-3" />

      <div className="flex flex-col gap-3">
        {menu.items.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-2">
            <MenuItemEditor
              item={item}
              locale={locale}
              defaultLocale={defaultLocale}
              disabled={disabled}
              onChange={(patch) => patchItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
              onMoveUp={index > 0 ? () => moveItem(index, -1) : undefined}
              onMoveDown={
                index < menu.items.length - 1
                  ? () => moveItem(index, 1)
                  : undefined
              }
              /* 只有静态链接能挂子项：动态项的子项是它自己展开出来的 */
              onAddChild={
                item.source === "link" ? () => addChild(item.id) : undefined
              }
            />
            {item.children.map((child) => (
              <div key={child.id} className="ml-6 border-l pl-3">
                <MenuItemEditor
                  item={child}
                  locale={locale}
                  defaultLocale={defaultLocale}
                  disabled={disabled}
                  onChange={(patch) => patchItem(child.id, patch)}
                  onRemove={() => removeItem(child.id)}
                />
              </div>
            ))}
          </div>
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={disabled}
          onClick={addItem}
        >
          <Plus className="size-4" />
          {t("editor.menuItemAdd")}
        </Button>
      </div>
    </div>
  );
}

function MenuItemEditor({
  item,
  locale,
  defaultLocale,
  disabled,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddChild,
}: {
  item: SiteMenuItem;
  locale: AppLocale;
  defaultLocale: AppLocale;
  disabled?: boolean;
  onChange: (patch: Partial<SiteMenuItem>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddChild?: () => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const isLink = item.source === "link";

  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="flex items-center gap-2">
        <Select
          disabled={disabled}
          value={item.source}
          onValueChange={(next) =>
            onChange({
              source: next as SiteMenuSource,
              // 换来源时清掉上一种来源专属的字段，避免存一堆对不上的残值
              ...(next === "link" ? {} : { href: "" }),
              ...(next === "doc_category" ? {} : { category: "" }),
            })
          }
        >
          <SelectTrigger size="sm" className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITE_MENU_SOURCES.map((source) => (
              <SelectItem key={source} value={source}>
                {t(`editor.menuSource.${source}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          disabled={disabled}
          className="flex-1"
          value={readLocalizedSetting(item.label, locale, defaultLocale)}
          /* 动态项标签可空 → 用内置文案（如「文档」），所以占位写的是那个默认值 */
          placeholder={
            isLink
              ? t("editor.menuItemLabel")
              : t(`editor.menuSourceDefaultLabel.${item.source}`)
          }
          onChange={(event) =>
            onChange({
              label: writeLocalizedSetting(
                item.label,
                locale,
                defaultLocale,
                event.target.value,
              ) as SiteMenuItem["label"],
            })
          }
        />

        <div className="flex shrink-0">
          {onMoveUp ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              title={t("editor.moveUp")}
              onClick={onMoveUp}
            >
              <ChevronUp className="size-4" />
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              title={t("editor.moveDown")}
              onClick={onMoveDown}
            >
              <ChevronDown className="size-4" />
            </Button>
          ) : null}
          {onAddChild ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              title={t("editor.menuItemAddChild")}
              onClick={onAddChild}
            >
              <CornerDownRight className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            title={t("editor.menuItemRemove")}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {isLink ? (
          <SiteLinkField
            id={`menu-item-href-${item.id}`}
            value={item.href}
            disabled={disabled}
            placeholder="/pricing"
            onChange={(href) => onChange({ href })}
          />
        ) : null}

        {item.source === "doc_category" ? (
          <Input
            disabled={disabled}
            value={item.category}
            placeholder={t("editor.menuItemCategory")}
            onChange={(event) => onChange({ category: event.target.value })}
          />
        ) : null}

        {!isLink ? (
          <Select
            disabled={disabled}
            value={item.expand}
            onValueChange={(expand) =>
              onChange({ expand: expand as SiteMenuItem["expand"] })
            }
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="children">
                {t("editor.menuExpand.children")}
              </SelectItem>
              <SelectItem value="flat">
                {t("editor.menuExpand.flat")}
              </SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </div>
  );
}

function blankItem(): SiteMenuItem {
  return {
    id: createMenuItemId(),
    source: "link",
    label: "",
    href: "",
    category: "",
    expand: "children",
    children: [],
  };
}
