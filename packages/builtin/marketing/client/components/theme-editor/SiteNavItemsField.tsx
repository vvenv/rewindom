import { useState, type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { Copy, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { docCategories } from "../../../shared/marketing-doc.js";
import {
  cloneNavItems,
  safeNavItems,
  type SiteNavItem,
  type SiteNavSource,
} from "../../../shared/site-nav.js";
import {
  addNavChild,
  addNavItem,
  moveNavItem,
  patchNavItem,
  removeNavItem,
  reorderNavItem,
  type NavDropPlace,
} from "../../lib/site-nav-edit.js";

import { useSiteNavPreview } from "./site-nav-preview-context.js";
import { SiteNavItemRow, type NavItemRowDnd } from "./SiteNavItemRow.js";

import type { AppLocale } from "@be-water/shared";

const ROOT_LIST_ID = "root";

interface NavDragState {
  id: string;
  listId: string;
}

/**
 * 导航条目编辑：直接改本段 / 本块 settings 里的 items 数组。
 *
 * 没有菜单实体、没有齿轮换库——「添加」是带预设的下拉；页脚可一键复制页头。
 */
export function SiteNavItemsField({
  id,
  value,
  locale,
  defaultLocale,
  disabled,
  allowCopyFromHeader,
  onChange,
}: {
  id: string;
  value: unknown;
  locale: AppLocale;
  defaultLocale: AppLocale;
  disabled?: boolean;
  /** 页脚列：显示「从页头复制」。 */
  allowCopyFromHeader?: boolean;
  onChange: (next: SiteNavItem[]) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const preview = useSiteNavPreview();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<NavDragState | null>(null);
  const [drop, setDrop] = useState<{ id: string; place: NavDropPlace } | null>(
    null,
  );

  const items = safeNavItems(value);
  const categories = docCategories(preview.docs);
  const previewCtx = {
    navPages: preview.navPages,
    docs: preview.docs,
    locale,
    defaultLocale,
  };

  const commit = (next: SiteNavItem[]): void => onChange(next);

  const add = (source: SiteNavSource): void => {
    const next = addNavItem(items, source);
    commit(next.items);
    setExpandedId(next.id);
  };

  const copyHeader = (): void => {
    if (preview.headerItems.length === 0) return;
    commit(cloneNavItems(preview.headerItems));
  };

  const rowDnd = (itemId: string, listId: string): NavItemRowDnd => ({
    draggable: !disabled,
    dragging: drag?.id === itemId,
    accepts: Boolean(drag && drag.id !== itemId && drag.listId === listId),
    drop: drop?.id === itemId ? { place: drop.place } : null,
    onDragStart: () => setDrag({ id: itemId, listId }),
    onDragOver: (place) => setDrop({ id: itemId, place }),
    onDrop: (place) => {
      if (!drag || drag.listId !== listId) return;
      commit(reorderNavItem(items, drag.id, itemId, place));
      setDrag(null);
      setDrop(null);
    },
    onDragEnd: () => {
      setDrag(null);
      setDrop(null);
    },
  });

  return (
    <div className="flex flex-col gap-2" data-nav-items-field={id}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("editor.menuEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <div key={item.id} className="flex flex-col gap-1.5">
              <SiteNavItemRow
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
                onChange={(patch) => commit(patchNavItem(items, item.id, patch))}
                onRemove={() => commit(removeNavItem(items, item.id))}
                onMove={(delta) => commit(moveNavItem(items, item.id, delta))}
                canMoveUp={index > 0}
                canMoveDown={index < items.length - 1}
                onAddChild={
                  item.source === "link" && !disabled
                    ? () => {
                        const next = addNavChild(items, item.id);
                        commit(next.items);
                        setExpandedId(next.id);
                      }
                    : undefined
                }
                dnd={rowDnd(item.id, ROOT_LIST_ID)}
              />
              {item.children.map((child, childIndex) => (
                <SiteNavItemRow
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
                  onChange={(patch) =>
                    commit(patchNavItem(items, child.id, patch))
                  }
                  onRemove={() => commit(removeNavItem(items, child.id))}
                  onMove={(delta) =>
                    commit(moveNavItem(items, child.id, delta))
                  }
                  canMoveUp={childIndex > 0}
                  canMoveDown={childIndex < item.children.length - 1}
                  dnd={rowDnd(child.id, item.id)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
            >
              <Plus className="size-3.5" />
              {t("editor.menuItemAdd")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => add("link")}>
              {t("editor.menuSource.link")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => add("pages")}>
              {t("editor.menuSource.pages")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => add("docs")}>
              {t("editor.menuSource.docs")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={categories.length === 0}
              onSelect={() => add("doc_category")}
            >
              {t("editor.menuSource.doc_category")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {allowCopyFromHeader ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || preview.headerItems.length === 0}
            onClick={copyHeader}
          >
            <Copy className="size-3.5" />
            {t("editor.navCopyFromHeader")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
