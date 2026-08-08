import {
  PAGE_SECTION_TYPES,
  createBlock,
  createSection,
  isContainerSection,
  type PageSectionType,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "../../shared/section-schema.js";

export { PAGE_SECTION_TYPES, createBlock, createSection };
export type { PageSectionType, SiteBlock, SiteSection };

/**
 * 编辑器的 section 操作。
 *
 * 页面 sections 是一棵**两层**的树（容器段的列里还挂着子段），所以除了「在末尾加一段」
 * 之外的操作一律**按 id 在整棵树上定位**——不能用下标，下标只在自己那一层有意义，
 * 而调用方（区块树）根本不知道某一行属于哪一层。
 */

/** 拖放落点：放在目标行之前还是之后。 */
export type DropPlace = "before" | "after";

/** 通用「数组内移位」——section 与 block 复用同一套语义。 */
function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = [...items];
  const [item] = copy.splice(index, 1);
  if (!item) return items;
  copy.splice(next, 0, item);
  return copy;
}

/**
 * 通用「拖到目标行前 / 后」——两个 id 都得在**同一个**列表里，否则原样返回。
 *
 * block 用它：block 的 schema 属于所在 section，换不到别的段上去，同层是硬约束。
 * section 不用——它能跨层搬（见 `moveSectionTo`）。
 */
function reorderItem<T extends { id: string }>(
  items: T[],
  sourceId: string,
  targetId: string,
  place: DropPlace,
): T[] {
  if (sourceId === targetId) return items;
  const from = items.findIndex((item) => item.id === sourceId);
  if (from < 0 || !items.some((item) => item.id === targetId)) return items;
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  if (!item) return items;
  // 落点下标要在**摘掉源项之后**重算：源项在目标之前时，目标已经往前挪了一格
  const target = copy.findIndex((entry) => entry.id === targetId);
  copy.splice(place === "after" ? target + 1 : target, 0, item);
  return copy;
}

/** 容器 block（列）：`sections` 有值就是容器，见 shared 的 `BlockDefinition.container`。 */
function isColumn(block: SiteBlock): boolean {
  return block.sections !== undefined;
}

/** 逐个改写树上的每一段（结构不变，只换内容）。 */
function mapTree(
  sections: SiteSection[],
  update: (section: SiteSection) => SiteSection,
): SiteSection[] {
  return sections.map((section) => {
    const next = update(section);
    if (!next.blocks.some(isColumn)) return next;
    return {
      ...next,
      blocks: next.blocks.map((block) =>
        isColumn(block)
          ? { ...block, sections: mapTree(block.sections ?? [], update) }
          : block,
      ),
    };
  });
}

/**
 * 对树上**每一层**的兄弟列表做同一个变换（增删排序用）。
 *
 * 变换只会命中目标 id 所在的那一层，其余层原样返回——调用方因此不必先知道
 * 目标在哪一层，也就不需要「先查父级再操作」这种两步走。
 */
function mapSiblings(
  sections: SiteSection[],
  update: (siblings: SiteSection[]) => SiteSection[],
): SiteSection[] {
  return update(sections).map((section) =>
    section.blocks.some(isColumn)
      ? {
          ...section,
          blocks: section.blocks.map((block) =>
            isColumn(block)
              ? {
                  ...block,
                  sections: mapSiblings(block.sections ?? [], update),
                }
              : block,
          ),
        }
      : section,
  );
}

/** 树上按 id 取一段（含列里的子段）。 */
export function findSection(
  sections: SiteSection[],
  sectionId: string,
): SiteSection | null {
  for (const section of sections) {
    if (section.id === sectionId) return section;
    for (const block of section.blocks) {
      if (!isColumn(block)) continue;
      const hit = findSection(block.sections ?? [], sectionId);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * 从根到目标的 section id 链（含目标自己）；找不到返回空数组。
 * 区块树用它决定「哪些行要展开」——选中列里的子段时，外面的容器段得跟着展开。
 */
export function findSectionPath(
  sections: SiteSection[],
  sectionId: string,
): string[] {
  for (const section of sections) {
    if (section.id === sectionId) return [section.id];
    for (const block of section.blocks) {
      if (!isColumn(block)) continue;
      const path = findSectionPath(block.sections ?? [], sectionId);
      if (path.length > 0) return [section.id, ...path];
    }
  }
  return [];
}

export function moveSection(
  sections: SiteSection[],
  sectionId: string,
  direction: -1 | 1,
): SiteSection[] {
  return mapSiblings(sections, (siblings) => {
    const index = siblings.findIndex((section) => section.id === sectionId);
    return index < 0 ? siblings : moveItem(siblings, index, direction);
  });
}

export function updateSectionSettings(
  sections: SiteSection[],
  sectionId: string,
  settings: SettingValues,
): SiteSection[] {
  return mapTree(sections, (section) =>
    section.id === sectionId ? { ...section, settings } : section,
  );
}

export function removeSection(
  sections: SiteSection[],
  sectionId: string,
): SiteSection[] {
  return mapSiblings(sections, (siblings) =>
    siblings.filter((section) => section.id !== sectionId),
  );
}

export function addSection(
  sections: SiteSection[],
  type: PageSectionType,
): SiteSection[] {
  return [...sections, createSection(type)];
}

/** 把一段挂到某一列末尾（新建与搬移共用）。 */
function appendToColumn(
  sections: SiteSection[],
  columnBlockId: string,
  section: SiteSection,
): SiteSection[] {
  return mapTree(sections, (owner) =>
    owner.blocks.some((block) => block.id === columnBlockId)
      ? {
          ...owner,
          blocks: owner.blocks.map((block) =>
            block.id === columnBlockId && isColumn(block)
              ? { ...block, sections: [...(block.sections ?? []), section] }
              : block,
          ),
        }
      : owner,
  );
}

/** 往容器段的某一列末尾加一段。 */
export function addSectionToColumn(
  sections: SiteSection[],
  columnBlockId: string,
  type: PageSectionType,
): { sections: SiteSection[]; created: SiteSection } {
  const created = createSection(type);
  return {
    created,
    sections: appendToColumn(sections, columnBlockId, created),
  };
}

/**
 * 搬移的落点：插到某一段前 / 后，或挂到某一列末尾。
 * 后者是给**空列**用的——那儿一行都没有，没有可以瞄准的目标。
 */
export type SectionDropTarget =
  | { kind: "section"; targetId: string; place: DropPlace }
  | { kind: "column"; columnBlockId: string };

/**
 * 跨层搬移一段：从原来的位置摘掉，再插到落点。
 *
 * 与 `reorderSection` 的区别是它**换爹**——`mapSiblings` 那套只在同一层内换位，
 * 表达不了「从页面顶层搬进某一列」。搬移不动 settings：列内子段的 `contained`
 * 收窄是渲染期的事（见 `SiteSections`），不落库。
 *
 * 两条规矩，违反了原样返回（宁可拖不动，也不搬出一棵服务端会拒收的树）：
 * 1. **嵌套只允许一层**——容器段进不了列（服务端 `site.sections_invalid`）
 * 2. 不能拖进自己里面——含自己列里的子段
 */
export function moveSectionTo(
  sections: SiteSection[],
  sourceId: string,
  target: SectionDropTarget,
): SiteSection[] {
  const moved = findSection(sections, sourceId);
  if (!moved) return sections;

  // 落点在自己的子树里：搬完自己就没地方挂了
  if (target.kind === "section" && findSection([moved], target.targetId)) {
    return sections;
  }
  const intoColumn =
    target.kind === "column" ||
    (target.kind === "section" &&
      findSectionPath(sections, target.targetId).length > 1);
  if (intoColumn && isContainerSection(moved.type)) return sections;

  const without = removeSection(sections, sourceId);
  if (target.kind === "column") {
    return appendToColumn(without, target.columnBlockId, moved);
  }
  const { targetId, place } = target;
  return mapSiblings(without, (siblings) => {
    const at = siblings.findIndex((section) => section.id === targetId);
    if (at < 0) return siblings;
    const copy = [...siblings];
    copy.splice(place === "after" ? at + 1 : at, 0, moved);
    return copy;
  });
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                     */
/* -------------------------------------------------------------------------- */

function mapSectionBlocks(
  sections: SiteSection[],
  sectionId: string,
  update: (blocks: SiteBlock[]) => SiteBlock[],
): SiteSection[] {
  return mapTree(sections, (section) =>
    section.id === sectionId
      ? { ...section, blocks: update(section.blocks) }
      : section,
  );
}

export function addBlock(
  sections: SiteSection[],
  sectionId: string,
  blockType: string,
): SiteSection[] {
  const section = findSection(sections, sectionId);
  if (!section) return sections;
  const block = createBlock(section.type, blockType);
  return mapSectionBlocks(sections, sectionId, (blocks) => [...blocks, block]);
}

export function removeBlock(
  sections: SiteSection[],
  sectionId: string,
  blockId: string,
): SiteSection[] {
  return mapSectionBlocks(sections, sectionId, (blocks) =>
    blocks.filter((block) => block.id !== blockId),
  );
}

export function moveBlock(
  sections: SiteSection[],
  sectionId: string,
  index: number,
  direction: -1 | 1,
): SiteSection[] {
  return mapSectionBlocks(sections, sectionId, (blocks) =>
    moveItem(blocks, index, direction),
  );
}

export function reorderBlock(
  sections: SiteSection[],
  sectionId: string,
  sourceBlockId: string,
  targetBlockId: string,
  place: DropPlace,
): SiteSection[] {
  return mapSectionBlocks(sections, sectionId, (blocks) =>
    reorderItem(blocks, sourceBlockId, targetBlockId, place),
  );
}

export function updateBlockSettings(
  sections: SiteSection[],
  sectionId: string,
  blockId: string,
  settings: SettingValues,
): SiteSection[] {
  return mapSectionBlocks(sections, sectionId, (blocks) =>
    blocks.map((block) =>
      block.id === blockId ? { ...block, settings } : block,
    ),
  );
}
