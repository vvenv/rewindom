import { type ReactElement, type ReactNode } from "react";

import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
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
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  getSectionDefinition,
  PAGE_SECTION_TYPES,
  settingText,
  type PageSectionType,
  type SiteSection,
} from "../../../shared/section-schema.js";

import { BLOCK_ICONS, SECTION_ICONS } from "./section-icons.js";

import type { ThemeEditorSelection } from "../../hooks/use-site-theme-editor.js";

export type { ThemeEditorSelection };

interface SectionTreeProps {
  sections: SiteSection[];
  header: SiteSection | null;
  footer: SiteSection | null;
  selection: ThemeEditorSelection | null;
  canWrite: boolean;
  onSelect: (selection: ThemeEditorSelection) => void;
  onAddSection: (type: PageSectionType) => void;
  onRemoveSection: (sectionId: string) => void;
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onAddBlock: (sectionId: string, blockType: string) => void;
  onRemoveBlock: (sectionId: string, blockId: string) => void;
  onMoveBlock: (sectionId: string, index: number, direction: -1 | 1) => void;
  /** 页面预设入口（套用默认官网版式） */
  presetSlot?: ReactNode;
}

/**
 * 左侧区块树：页头 / 模板 / 页脚三组，对齐 Shopify 的 sections group。
 * 增删与排序集中在树里，右侧设置面板只负责渲染 schema。
 */
export function SectionTree({
  sections,
  header,
  footer,
  selection,
  canWrite,
  onSelect,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  presetSlot,
}: SectionTreeProps): ReactElement {
  const { t } = useTranslation("marketing");

  const renderSection = (
    section: SiteSection,
    options: {
      index?: number;
      total?: number;
      removable: boolean;
      movable: boolean;
    },
  ): ReactElement => {
    const def = getSectionDefinition(section.type);
    const Icon = SECTION_ICONS[section.type];
    const sectionSelected =
      selection?.sectionId === section.id && selection.blockId === null;
    const expanded = selection?.sectionId === section.id;
    const blockTypes = def.blocks ?? [];
    const blocksFull =
      def.max_blocks !== undefined && section.blocks.length >= def.max_blocks;

    return (
      <div key={section.id}>
        <TreeRow
          selected={sectionSelected}
          icon={
            blockTypes.length > 0 ? (
              expanded ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              )
            ) : Icon ? (
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            ) : null
          }
          label={sectionLabel(section, t(def.label))}
          canWrite={canWrite}
          movable={options.movable}
          removable={options.removable}
          disableUp={options.index === 0}
          disableDown={
            options.total !== undefined && options.index === options.total - 1
          }
          onSelect={() => onSelect({ sectionId: section.id, blockId: null })}
          onMoveUp={() => {
            if (options.index !== undefined) onMoveSection(options.index, -1);
          }}
          onMoveDown={() => {
            if (options.index !== undefined) onMoveSection(options.index, 1);
          }}
          onRemove={() => onRemoveSection(section.id)}
        />

        {expanded && blockTypes.length > 0 ? (
          <div className="ml-4 border-l pl-2">
            {section.blocks.map((block, blockIndex) => {
              const BlockIcon = BLOCK_ICONS[block.type];
              const blockDef = blockTypes.find(
                (item) => item.type === block.type,
              );
              return (
                <TreeRow
                  key={block.id}
                  selected={selection?.blockId === block.id}
                  icon={
                    BlockIcon ? (
                      <BlockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    ) : null
                  }
                  label={blockLabel(
                    block.settings,
                    blockDef ? t(blockDef.label) : block.type,
                  )}
                  canWrite={canWrite}
                  movable
                  removable
                  disableUp={blockIndex === 0}
                  disableDown={blockIndex === section.blocks.length - 1}
                  onSelect={() =>
                    onSelect({ sectionId: section.id, blockId: block.id })
                  }
                  onMoveUp={() => onMoveBlock(section.id, blockIndex, -1)}
                  onMoveDown={() => onMoveBlock(section.id, blockIndex, 1)}
                  onRemove={() => onRemoveBlock(section.id, block.id)}
                />
              );
            })}

            {canWrite ? (
              <AddMenu
                key={`add-block-${section.id}-${section.blocks.length}`}
                placeholder={t("editor.addBlock")}
                disabled={blocksFull}
                options={blockTypes.map((block) => ({
                  value: block.type,
                  label: t(block.label),
                }))}
                onSelect={(type) => onAddBlock(section.id, type)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    // 滚动落在 aside 上，三个分组一律 `shrink-0`：它们是 column flex item，
    // 默认会被压到比内容还矮，压缩后内容溢出、直接盖住后面的分组
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
      {header ? (
        <div className="flex shrink-0 flex-col gap-0.5">
          <GroupLabel>{t("editor.group.headerArea")}</GroupLabel>
          {renderSection(header, { removable: false, movable: false })}
        </div>
      ) : null}

      <div className="flex shrink-0 flex-col gap-0.5">
        <GroupLabel>
          {t("editor.group.template")}
          <Badge variant="outline" className="ml-auto">
            {sections.length}
          </Badge>
        </GroupLabel>

        {sections.map((section, index) =>
          renderSection(section, {
            index,
            total: sections.length,
            removable: true,
            movable: true,
          }),
        )}

        {sections.length === 0 ? (
          <p className="px-1 py-4 text-xs text-muted-foreground">
            {t("editor.emptySections")}
          </p>
        ) : null}

        {canWrite ? (
          <AddMenu
            key={`add-section-${sections.length}`}
            placeholder={t("editor.addSection")}
            options={PAGE_SECTION_TYPES.map((type) => ({
              value: type,
              label: t(getSectionDefinition(type).label),
            }))}
            onSelect={(type) => onAddSection(type as PageSectionType)}
          />
        ) : null}
        {canWrite ? presetSlot : null}
      </div>

      {footer ? (
        <div className="flex shrink-0 flex-col gap-0.5">
          <GroupLabel>{t("editor.group.footerArea")}</GroupLabel>
          {renderSection(footer, { removable: false, movable: false })}
        </div>
      ) : null}
    </aside>
  );
}

function GroupLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="flex items-center gap-2 px-1 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

interface TreeRowProps {
  selected: boolean;
  icon: ReactElement | null;
  label: string;
  canWrite: boolean;
  movable: boolean;
  removable: boolean;
  disableUp?: boolean;
  disableDown?: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function TreeRow({
  selected,
  icon,
  label,
  canWrite,
  movable,
  removable,
  disableUp,
  disableDown,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
}: TreeRowProps): ReactElement {
  const { t } = useTranslation("marketing");
  const showActions = canWrite && (movable || removable);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm",
        selected
          ? "border-primary bg-muted/60"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      {/* 整个 item 都是选中热区，操作按钮通过 relative 浮在其上 */}
      <button
        type="button"
        className="absolute inset-0 rounded-md"
        onClick={onSelect}
      >
        <span className="sr-only">{label}</span>
      </button>
      <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-1.5 text-left">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {showActions ? (
        <div className="relative flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {movable ? (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("editor.moveUp")}
                disabled={disableUp}
                onClick={onMoveUp}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("editor.moveDown")}
                disabled={disableDown}
                onClick={onMoveDown}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </>
          ) : null}
          {removable ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t("editor.remove")}
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface AddMenuProps {
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onSelect: (value: string) => void;
}

function AddMenu({
  placeholder,
  options,
  disabled,
  onSelect,
}: AddMenuProps): ReactElement {
  return (
    <Select disabled={disabled} onValueChange={onSelect}>
      <SelectTrigger className="mt-1 w-full" size="sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="inline-flex items-center gap-2">
              <Plus className="size-3.5" />
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 树里优先显示用户填的标题，退回 section/block 类型名。 */
function sectionLabel(section: SiteSection, fallback: string): string {
  for (const id of ["headline", "title", "heading"]) {
    const value = settingText(section.settings, id).trim();
    if (value) return value;
  }
  return fallback;
}

function blockLabel(
  settings: SiteSection["blocks"][number]["settings"],
  fallback: string,
): string {
  for (const id of ["title", "label", "name", "question", "term", "value"]) {
    const value = settingText(settings, id).trim();
    if (value) return value;
  }
  return fallback;
}
