import {
  useState,
  type DragEvent,
  type ReactElement,
  type ReactNode,
} from "react";

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
  FileText,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  getSectionDefinition,
  isContainerSection,
  PAGE_SECTION_TYPES,
  sectionTypesFor,
  settingText,
  type SectionType,
  type SiteSection,
} from "../../../shared/section-schema.js";
import {
  findSectionPath,
  type DropPlace,
  type SectionDropTarget,
} from "../../lib/section-schema.js";

import { BLOCK_ICONS, SECTION_ICONS } from "./section-icons.js";

import type { ThemeEditorSelection } from "../../hooks/use-site-theme-editor.js";

export type { ThemeEditorSelection };

/** 新段加到哪儿。 */
export type AddTarget =
  | { kind: "page" }
  | { kind: "column"; columnBlockId: string }
  | { kind: "area"; area: "header" | "footer" };

interface SectionTreeProps {
  sections: SiteSection[];
  header: SiteSection[];
  footer: SiteSection[];
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  /** 选中的是页面元数据（左树最上面那一行）。 */
  metaSelected: boolean;
  canWrite: boolean;
  onSelect: (sectionId: string, blockId: string | null) => void;
  onSelectMeta: () => void;
  /** `target` 说明加到哪儿：页面末尾、某一列，或页头 / 页脚区。 */
  onAddSection: (type: SectionType, target: AddTarget) => void;
  onRemoveSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  /** 拖放 / 「移动到」菜单：跨层与同层换位统一走它。 */
  onMoveSectionTo: (sourceId: string, target: SectionDropTarget) => void;
  onAddBlock: (sectionId: string, blockType: string) => void;
  onRemoveBlock: (sectionId: string, blockId: string) => void;
  onMoveBlock: (sectionId: string, index: number, direction: -1 | 1) => void;
  onReorderBlock: (
    sectionId: string,
    sourceBlockId: string,
    targetBlockId: string,
    place: DropPlace,
  ) => void;
}

/**
 * 正在拖的行。
 *
 * section 与 block 的搬移规矩不同，所以分开：block 认死 `listId`（一个 `card`
 * 换不到 `faq` 段上去，它的 schema 属于所在 section），section 则可以跨层——
 * 页面顶层 ⇄ 分栏的列，规矩见 `moveSectionTo`。
 */
type DragState =
  | { kind: "section"; id: string; container: boolean }
  | { kind: "block"; id: string; listId: string };

/**
 * 左侧区块树：页头 / 模板 / 页脚三组，对齐 Shopify 的 sections group。
 * 增删与排序集中在树里，右侧设置面板只负责渲染 schema。
 */
export function SectionTree({
  sections,
  header,
  footer,
  selectedSectionId,
  selectedBlockId,
  metaSelected,
  canWrite,
  onSelect,
  onSelectMeta,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onMoveSectionTo,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onReorderBlock,
}: SectionTreeProps): ReactElement {
  const { t } = useTranslation("marketing");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [drop, setDrop] = useState<TreeRowDnd["drop"]>(null);

  /**
   * 拖着的这一段能不能落到某个「页面区块」落点上。
   *
   * `targetId` 为 null = 落到空列上（那儿没有行可瞄）。三条规矩与 `moveSectionTo`
   * 一致，UI 先拦一道：落不下去（光标显示禁止）比落下去被静默丢弃清楚。
   */
  const acceptsSection = (
    targetId: string | null,
    inColumn: boolean,
  ): boolean => {
    if (drag?.kind !== "section") return false;
    // 嵌套只允许一层：容器段进不了列
    if (inColumn && drag.container) return false;
    if (targetId === null) return true;
    if (targetId === drag.id) return false;
    // 落点在自己的子树里：搬完自己就没地方挂了
    return !findSectionPath(sections, targetId).includes(drag.id);
  };

  /**
   * 落下拖拽状态——**推迟一帧**，不能在 `dragstart` 里同步做。
   *
   * React 对 `dragstart` 这类 discrete 事件是同步 flush 的：在处理器里 setState
   * 会当场改 DOM，而这会儿浏览器还没把拖拽会话建起来（还要拍拖拽快照）。
   * Chrome / WebKit 遇到 dragstart 期间的 DOM 改动会**直接中止这次拖拽**——
   * 表现就是「有分栏的页面整个拖不动」：`revealColumns` 一展开分栏就插了新节点，
   * 而没有分栏的页面什么都不动，所以看着好好的。
   */
  const beginDrag = (next: DragState): void => {
    requestAnimationFrame(() => setDrag(next));
  };

  /**
   * 一行的拖放接线。
   *
   * section 能跨层落（换爹，走 `onMoveSectionTo`），block 只在自己 section 内换位。
   */
  const dndFor = (options: {
    id: string;
    enabled: boolean;
    accepts: boolean;
    start: () => DragState;
    commit: (sourceId: string, place: DropPlace) => void;
  }): TreeRowDnd => ({
    id: options.id,
    draggable: canWrite && options.enabled,
    dragging: drag?.id === options.id,
    accepts: options.accepts,
    drop: drop?.id === options.id ? drop : null,
    onDragStart: () => beginDrag(options.start()),
    onDragOver: (place) =>
      setDrop((current) =>
        current?.id === options.id && current.place === place
          ? current
          : { id: options.id, place },
      ),
    onDrop: (place) => {
      if (drag) options.commit(drag.id, place);
      setDrag(null);
      setDrop(null);
    },
    onDragEnd: () => {
      setDrag(null);
      setDrop(null);
    },
  });

  /**
   * 展开哪些行：选中项**这一支**上的所有祖先。
   * 选中容器段列里的子段时，外面的容器段得跟着展开，否则选中的行整个看不见。
   */
  const expandedIds = new Set(
    selectedSectionId ? findSectionPath(sections, selectedSectionId) : [],
  );
  if (selectedSectionId) expandedIds.add(selectedSectionId);

  /**
   * 拖一段普通区块时，把所有分栏段摊开。
   *
   * 否则要拖进一个没展开的分栏，得先去选中它里面的东西把它展开——拖到一半手是
   * 松不开的。展开的只是树，不动选中。
   */
  const revealColumns = drag?.kind === "section" && !drag.container;

  /** 容器段的列里能放什么：除了容器段自己——嵌套只允许一层。 */
  const childSectionOptions = PAGE_SECTION_TYPES.filter(
    (type) => !isContainerSection(type),
  ).map((type) => ({
    value: type,
    label: t(getSectionDefinition(type).label),
  }));

  /**
   * 页头 / 页脚区：与页面区块**同构**的一串 section。
   *
   * 区域本体（导航条 / 页脚本体）不可删不可移——它就是这个区域本身；其余段
   * （公告条、备案号之类）随便加、随便排。能放什么由 registry 的 `placements` 说了算。
   */
  const renderArea = (
    area: "header" | "footer",
    list: SiteSection[],
  ): ReactElement => (
    <div className="flex shrink-0 flex-col gap-0.5">
      <GroupLabel>
        {t(
          area === "header"
            ? "editor.group.headerArea"
            : "editor.group.footerArea",
        )}
      </GroupLabel>
      {list.map((section, index) =>
        renderSection(section, {
          index,
          total: list.length,
          // 本体是这个区域自己，别让它被删掉或挪走
          removable: section.type !== area,
          movable: section.type !== area,
          inColumn: false,
        }),
      )}
      {canWrite ? (
        <AddMenu
          key={`add-${area}-${list.length}`}
          placeholder={t("editor.addSection")}
          options={sectionTypesFor(area)
            .filter((type) => type !== area)
            .map((type) => ({
              value: type,
              label: t(getSectionDefinition(type).label),
            }))}
          onSelect={(type) =>
            onAddSection(type as SectionType, { kind: "area", area })
          }
        />
      ) : null}
    </div>
  );

  const renderSection = (
    section: SiteSection,
    options: {
      index?: number;
      total?: number;
      removable: boolean;
      movable: boolean;
      /** 这一段是不是长在某一列里（决定容器段能不能落到它旁边）。 */
      inColumn: boolean;
    },
  ): ReactElement => {
    const def = getSectionDefinition(section.type);
    const Icon = SECTION_ICONS[section.type];
    const sectionSelected =
      selectedSectionId === section.id && selectedBlockId === null;
    const container = isContainerSection(section.type);
    const expanded =
      expandedIds.has(section.id) || (revealColumns && container);
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
          onSelect={() => onSelect(section.id, null)}
          onMoveUp={() => onMoveSection(section.id, -1)}
          onMoveDown={() => onMoveSection(section.id, 1)}
          onRemove={() => onRemoveSection(section.id)}
          dnd={dndFor({
            id: section.id,
            enabled: options.movable,
            // 页头页脚不在页面区块那棵树上，别人落不到它旁边
            accepts:
              options.movable && acceptsSection(section.id, options.inColumn),
            start: () => ({ kind: "section", id: section.id, container }),
            // 同层换位也走这条：摘掉再插回目标旁边，本来就是「同层换位」的定义
            commit: (sourceId, place) =>
              onMoveSectionTo(sourceId, {
                kind: "section",
                targetId: section.id,
                place,
              }),
          })}
        />

        {expanded && blockTypes.length > 0 ? (
          <div className="ml-4 border-l pl-2">
            {section.blocks.map((block, blockIndex) => {
              const BlockIcon = BLOCK_ICONS[block.type];
              const blockDef = blockTypes.find(
                (item) => item.type === block.type,
              );
              return (
                <div key={block.id}>
                  <TreeRow
                    selected={selectedBlockId === block.id}
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
                    onSelect={() => onSelect(section.id, block.id)}
                    onMoveUp={() => onMoveBlock(section.id, blockIndex, -1)}
                    onMoveDown={() => onMoveBlock(section.id, blockIndex, 1)}
                    onRemove={() => onRemoveBlock(section.id, block.id)}
                    dnd={dndFor({
                      id: block.id,
                      enabled: true,
                      // block 的 schema 属于所在 section，换不到别的段上去
                      accepts:
                        drag?.kind === "block" &&
                        drag.listId === section.id &&
                        drag.id !== block.id,
                      start: () => ({
                        kind: "block",
                        id: block.id,
                        listId: section.id,
                      }),
                      commit: (sourceId, place) =>
                        onReorderBlock(section.id, sourceId, block.id, place),
                    })}
                  />

                  {/* 容器 block（列）：里面还挂着一串子段 */}
                  {block.sections ? (
                    <div className="ml-4 border-l pl-2">
                      {block.sections.map((child, childIndex) =>
                        renderSection(child, {
                          index: childIndex,
                          total: block.sections?.length,
                          removable: true,
                          movable: true,
                          inColumn: true,
                        }),
                      )}
                      {/*
                        空列一行都没有，光靠子段的行接不住拖放——而新建的分栏段正好
                        是两个空列，「拖进分栏」最常见的一下就落在这儿。
                      */}
                      {block.sections.length === 0 &&
                      acceptsSection(null, true) ? (
                        <ColumnDropZone
                          columnBlockId={block.id}
                          active={drop?.id === block.id}
                          onDragOver={() =>
                            setDrop((current) =>
                              current?.id === block.id
                                ? current
                                : { id: block.id, place: "after" },
                            )
                          }
                          onDrop={() => {
                            if (drag) {
                              onMoveSectionTo(drag.id, {
                                kind: "column",
                                columnBlockId: block.id,
                              });
                            }
                            setDrag(null);
                            setDrop(null);
                          }}
                        />
                      ) : null}
                      {canWrite ? (
                        <AddMenu
                          key={`add-child-${block.id}-${block.sections.length}`}
                          placeholder={t("editor.addSection")}
                          options={childSectionOptions}
                          onSelect={(type) =>
                            onAddSection(type as SectionType, {
                              kind: "column",
                              columnBlockId: block.id,
                            })
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
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
      {/*
        页面自己也占一行：标题 / SEO 描述改起来不用退回页面列表，
        而且它跟区块一样会即时反映到中间的预览上。
      */}
      <div className="flex shrink-0 flex-col gap-0.5">
        <GroupLabel>{t("editor.group.page")}</GroupLabel>
        <MetaRow
          selected={metaSelected}
          label={t("editor.pageMeta")}
          onSelect={onSelectMeta}
        />
      </div>

      {renderArea("header", header)}

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
            inColumn: false,
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
            onSelect={(type) =>
              onAddSection(type as SectionType, { kind: "page" })
            }
          />
        ) : null}
      </div>

      {renderArea("footer", footer)}
    </aside>
  );
}

/**
 * 页面元数据那一行——不是 section，所以没有拖放、增删、上下移，
 * 单纯是个选中项，套用与 `TreeRow` 一致的观感。
 */
function MetaRow({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-sm",
        selected
          ? "border-primary bg-muted/60"
          : "border-transparent hover:bg-muted/40",
      )}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function GroupLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="flex items-center gap-2 px-1 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** 一行的拖放接线，由 `SectionTree.dndFor` 组装。 */
interface TreeRowDnd {
  /** 这一行代表的 section / block id，落在 `data-row-id` 上供定位。 */
  id: string;
  /** 这一行能不能被拖起来（页头页脚不能）。 */
  draggable: boolean;
  /** 自己正被拖。 */
  dragging: boolean;
  /** 当前拖的那一行能不能落到自己身上（规矩见 `acceptsSection`）。 */
  accepts: boolean;
  /** 落点指示线画在自己上边还是下边。 */
  drop: { id: string; place: DropPlace } | null;
  onDragStart: () => void;
  onDragOver: (place: DropPlace) => void;
  onDrop: (place: DropPlace) => void;
  onDragEnd: () => void;
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
  dnd: TreeRowDnd;
}

/** 指针落在行的上半 / 下半 → 插到这一行之前 / 之后。 */
function dropPlaceOf(event: DragEvent<HTMLElement>): DropPlace {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientY - rect.top < rect.height / 2 ? "before" : "after";
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
  dnd,
}: TreeRowProps): ReactElement {
  const { t } = useTranslation("marketing");
  const showActions = canWrite && (movable || removable);

  return (
    <div
      data-row-id={dnd.id}
      // 整行都是拖动把手：行内那层覆盖式选中按钮是它的后代，从按钮上按下去
      // 一样会带起这一行
      draggable={dnd.draggable}
      onDragStart={(event) => {
        // Firefox 不带 payload 就不发 drag 事件；真正的载荷在 SectionTree 的 state 里
        event.dataTransfer.setData("text/plain", label);
        event.dataTransfer.effectAllowed = "move";
        dnd.onDragStart();
      }}
      onDragEnd={dnd.onDragEnd}
      onDragOver={(event) => {
        if (!dnd.accepts) return;
        // 不 preventDefault 就落不下去：不接收的行因此保持「禁止」光标
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
        "group relative flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm",
        selected
          ? "border-primary bg-muted/60"
          : "border-transparent hover:bg-muted/40",
        dnd.draggable && "cursor-grab active:cursor-grabbing",
        dnd.dragging && "opacity-40",
      )}
    >
      {/* 落点指示线；行本身是 relative，画在边框上 */}
      {dnd.drop ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-primary",
            dnd.drop.place === "before" ? "-top-px" : "-bottom-px",
          )}
        />
      ) : null}
      {/* 整个 item 都是选中热区，操作按钮通过 relative 浮在其上 */}
      <button
        type="button"
        className="absolute inset-0 rounded-md"
        onClick={onSelect}
      >
        <span className="sr-only">{label}</span>
      </button>
      <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-1.5 text-left">
        {dnd.draggable ? (
          <GripVertical className="size-3.5 shrink-0 text-muted-foreground/40" />
        ) : null}
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

interface ColumnDropZoneProps {
  columnBlockId: string;
  /** 拖的东西正悬在自己身上。 */
  active: boolean;
  onDragOver: () => void;
  onDrop: () => void;
}

/**
 * 空列的放置区：只在拖着一段能进列的区块时出现。
 * 空列一行都没有，没有它就整个接不住拖放——而新建的分栏正好是两个空列。
 */
function ColumnDropZone({
  columnBlockId,
  active,
  onDragOver,
  onDrop,
}: ColumnDropZoneProps): ReactElement {
  const { t } = useTranslation("marketing");
  return (
    <div
      data-column-drop={columnBlockId}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={cn(
        "rounded-md border border-dashed px-2 py-2 text-center text-xs transition-colors",
        active
          ? "border-primary bg-muted/60 text-foreground"
          : "border-muted-foreground/30 text-muted-foreground",
      )}
    >
      {t("editor.dropIntoColumn")}
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
