import { type DragEvent, type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { cn } from "@be-water/ui/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CornerDownRight,
  GripVertical,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  readLocalizedSetting,
  writeLocalizedSetting,
} from "../../../shared/section-schema.js";
import {
  resolveSiteMenuItem,
  SITE_MENU_SOURCES,
  type ResolvedMenuItem,
  type SiteMenuContext,
  type SiteMenuItem,
  type SiteMenuSource,
} from "../../../shared/site-menu.js";
import {
  menuItemSourcePatch,
  type MenuDropPlace,
} from "../../lib/site-menu-edit.js";

import { SiteLinkField } from "./SiteLinkField.js";

import type { AppLocale } from "@be-water/shared";

/** 就地预览最多列几条：再多在 300px 的侧栏里只会把控件挤到折叠线以下。 */
const PREVIEW_LIMIT = 6;

export interface MenuItemRowDnd {
  draggable: boolean;
  dragging: boolean;
  accepts: boolean;
  drop: { place: MenuDropPlace } | null;
  onDragStart: () => void;
  onDragOver: (place: MenuDropPlace) => void;
  onDrop: (place: MenuDropPlace) => void;
  onDragEnd: () => void;
}

interface SiteMenuItemRowProps {
  item: SiteMenuItem;
  /** 子项：缩进 + 不给「添加子项」（只允许一层）。 */
  nested?: boolean;
  expanded: boolean;
  onToggle: () => void;
  locale: AppLocale;
  defaultLocale: AppLocale;
  /** 展开动态项用的内容快照。 */
  preview: SiteMenuContext;
  /** 文档分类候选（`doc_category` 用）。 */
  categories: readonly string[];
  disabled?: boolean;
  onChange: (patch: Partial<SiteMenuItem>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** 不传 = 这一条不能挂子项。 */
  onAddChild?: () => void;
  dnd: MenuItemRowDnd;
}

/**
 * 一条菜单项：**折叠时是一行，展开才是一张表单**。
 *
 * 排序交互对齐区块树：行内上下移、拖放换位，不把顺序藏进下拉里。
 */
export function SiteMenuItemRow({
  item,
  nested,
  expanded,
  onToggle,
  locale,
  defaultLocale,
  preview,
  categories,
  disabled,
  onChange,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
  onAddChild,
  dnd,
}: SiteMenuItemRowProps): ReactElement {
  const { t } = useTranslation("marketing");
  const isLink = item.source === "link";
  const label = readLocalizedSetting(item.label, locale, defaultLocale);
  const title =
    label || (isLink ? t("editor.menuItemUntitled") : t(`editor.menuSource.${item.source}`));

  const resolved = isLink ? [] : resolveSiteMenuItem(item, preview);
  const leaves = leafLabels(resolved);
  const hint = isLink
    ? item.href || t("editor.menuItemNoHref")
    : leaves.length > 0
      ? t("editor.menuPreviewCount", { count: leaves.length })
      : t("editor.menuPreviewEmpty");

  const setLabel = (next: string): void =>
    onChange({
      label: writeLocalizedSetting(
        item.label,
        locale,
        defaultLocale,
        next,
      ) as SiteMenuItem["label"],
    });

  const showActions = !disabled;

  return (
    <div className={cn("rounded-md border bg-background", nested && "ml-4")}>
      <div
        data-row-id={item.id}
        draggable={dnd.draggable}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", title);
          event.dataTransfer.effectAllowed = "move";
          dnd.onDragStart();
        }}
        onDragEnd={dnd.onDragEnd}
        onDragOver={(event) => {
          if (!dnd.accepts) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          dnd.onDragOver(dropPlaceOf(event));
        }}
        onDrop={(event) => {
          if (!dnd.accepts) return;
          event.preventDefault();
          dnd.onDrop(dropPlaceOf(event));
        }}
        className={cn(
          "group relative flex items-center gap-1 py-1 pr-1 pl-2",
          dnd.draggable && "cursor-grab active:cursor-grabbing",
          dnd.dragging && "opacity-40",
        )}
      >
        {dnd.drop ? (
          <span
            className={cn(
              "pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-primary",
              dnd.drop.place === "before" ? "-top-px" : "-bottom-px",
            )}
          />
        ) : null}
        {nested ? (
          <CornerDownRight className="pointer-events-none size-3 shrink-0 text-muted-foreground/50" />
        ) : null}
        {dnd.draggable ? (
          <GripVertical className="pointer-events-none size-3.5 shrink-0 text-muted-foreground/40" />
        ) : null}
        <button
          type="button"
          className="relative z-10 flex min-w-0 flex-1 items-center gap-1 py-1 text-left"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">{title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {hint}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>

        {showActions ? (
          <div className="relative z-10 flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("editor.moveUp")}
              disabled={!canMoveUp}
              onClick={(event) => {
                event.stopPropagation();
                onMove(-1);
              }}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("editor.moveDown")}
              disabled={!canMoveDown}
              onClick={(event) => {
                event.stopPropagation();
                onMove(1);
              }}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            {onAddChild ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("editor.menuItemAddChild")}
                onClick={(event) => {
                  event.stopPropagation();
                  onAddChild();
                }}
              >
                <CornerDownRight className="size-3.5" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("editor.menuItemRemove")}
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="flex flex-col gap-2 border-t p-2">
          <Select
            disabled={disabled}
            value={item.source}
            onValueChange={(next) =>
              onChange(menuItemSourcePatch(next as SiteMenuSource))
            }
          >
            <SelectTrigger size="sm" className="w-full">
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
            value={label}
            placeholder={
              isLink
                ? t("editor.menuItemLabel")
                : t(`editor.menuSourceDefaultLabel.${item.source}`)
            }
            onChange={(event) => setLabel(event.target.value)}
          />

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
            <DocCategoryField
              value={item.category}
              categories={categories}
              disabled={disabled}
              onChange={(category) => onChange({ category })}
            />
          ) : null}

          {!isLink ? (
            <>
              <Select
                disabled={disabled}
                value={item.expand}
                onValueChange={(expand) =>
                  onChange({ expand: expand as SiteMenuItem["expand"] })
                }
              >
                <SelectTrigger size="sm" className="w-full">
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
              <MenuItemPreview labels={leaves} />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function dropPlaceOf(event: DragEvent<HTMLElement>): MenuDropPlace {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY - rect.top < rect.height / 2 ? "before" : "after";
}

function MenuItemPreview({ labels }: { labels: string[] }): ReactElement {
  const { t } = useTranslation("marketing");

  if (labels.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t("editor.menuPreviewEmptyHint")}
      </p>
    );
  }

  const shown = labels.slice(0, PREVIEW_LIMIT);
  return (
    <p className="text-xs text-muted-foreground">
      <span className="text-muted-foreground/70">
        {t("editor.menuPreviewLabel")}
      </span>{" "}
      {shown.join(" · ")}
      {labels.length > shown.length
        ? t("editor.menuPreviewMore", { count: labels.length - shown.length })
        : null}
    </p>
  );
}

function DocCategoryField({
  value,
  categories,
  disabled,
  onChange,
}: {
  value: string;
  categories: readonly string[];
  disabled?: boolean;
  onChange: (next: string) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <div className="flex gap-2">
      <Input
        disabled={disabled}
        value={value}
        placeholder={t("editor.menuItemCategory")}
        onChange={(event) => onChange(event.target.value)}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || categories.length === 0}
          >
            {t("editor.menuCategoryPick")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {t("editor.menuCategoryPickLabel")}
          </DropdownMenuLabel>
          {categories.map((category) => (
            <DropdownMenuItem
              key={category}
              onSelect={() => onChange(category)}
            >
              {category}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function leafLabels(items: readonly ResolvedMenuItem[]): string[] {
  return items.flatMap((item) =>
    item.children.length > 0 ? leafLabels(item.children) : [item.label],
  );
}
