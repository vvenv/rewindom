import { type DragEvent, type ReactElement, useState } from "react";

import { Button } from "@be-water/ui/button";
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
  resolveNavItem,
  SITE_NAV_SOURCES,
  type ResolvedNavItem,
  type SiteNavContext,
  type SiteNavItem,
  type SiteNavSource,
} from "../../../shared/site-nav.js";
import {
  navItemSourcePatch,
  type NavDropPlace,
} from "../../lib/site-nav-edit.js";

import { SiteLinkField } from "./SiteLinkField.js";

import type { AppLocale } from "@be-water/shared";

const PREVIEW_LIMIT = 6;

export interface NavItemRowDnd {
  draggable: boolean;
  dragging: boolean;
  accepts: boolean;
  drop: { place: NavDropPlace } | null;
  onDragStart: () => void;
  onDragOver: (place: NavDropPlace) => void;
  onDrop: (place: NavDropPlace) => void;
  onDragEnd: () => void;
}

interface SiteNavItemRowProps {
  item: SiteNavItem;
  nested?: boolean;
  expanded: boolean;
  onToggle: () => void;
  locale: AppLocale;
  defaultLocale: AppLocale;
  preview: SiteNavContext;
  categories: ReadonlyArray<{ key: string; label: string }>;
  disabled?: boolean;
  onChange: (patch: Partial<SiteNavItem>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onAddChild?: () => void;
  dnd: NavItemRowDnd;
}

export function SiteNavItemRow({
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
}: SiteNavItemRowProps): ReactElement {
  const { t } = useTranslation("marketing");
  const [showMore, setShowMore] = useState(false);
  const isLink = item.source === "link";
  const label = readLocalizedSetting(item.label, locale, defaultLocale);
  const title =
    label ||
    (isLink
      ? t("editor.menuItemUntitled")
      : t(`editor.menuSource.${item.source}`));

  const resolved = isLink ? [] : resolveNavItem(item, preview);
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
      ) as SiteNavItem["label"],
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
              onChange(navItemSourcePatch(next as SiteNavSource))
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITE_NAV_SOURCES.map((source) => (
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
              id={`nav-item-href-${item.id}`}
              value={item.href}
              disabled={disabled}
              placeholder="/pricing"
              onChange={(href) => onChange({ href })}
            />
          ) : null}

          {item.source === "doc_category" ? (
            <Select
              disabled={disabled || categories.length === 0}
              value={item.category || undefined}
              onValueChange={(category) => onChange({ category })}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder={t("editor.menuItemCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.key} value={category.key}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {!isLink ? (
            <>
              <NavItemPreview
                source={item.source}
                labels={leaves}
                category={item.category}
              />
              {showMore ? (
                <Select
                  disabled={disabled}
                  value={item.expand}
                  onValueChange={(expand) =>
                    onChange({ expand: expand as SiteNavItem["expand"] })
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
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start px-0 text-xs text-muted-foreground"
                  onClick={() => setShowMore(true)}
                >
                  {t("editor.navShowMore")}
                </Button>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function dropPlaceOf(event: DragEvent<HTMLElement>): NavDropPlace {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY - rect.top < rect.height / 2 ? "before" : "after";
}

function NavItemPreview({
  source,
  labels,
  category,
}: {
  source: SiteNavSource;
  labels: string[];
  category: string;
}): ReactElement {
  const { t } = useTranslation("marketing");

  if (labels.length === 0) {
    const hintKey =
      source === "pages"
        ? "editor.navPreviewEmptyPages"
        : source === "docs"
          ? "editor.navPreviewEmptyDocs"
          : category
            ? "editor.navPreviewEmptyCategory"
            : "editor.menuPreviewEmptyHint";
    return (
      <p className="text-xs text-muted-foreground">
        {t(hintKey, { category })}
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

function leafLabels(items: readonly ResolvedNavItem[]): string[] {
  return items.flatMap((item) =>
    item.children.length > 0 ? leafLabels(item.children) : [item.label],
  );
}
