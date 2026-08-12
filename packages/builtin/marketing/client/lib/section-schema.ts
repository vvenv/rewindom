import {
  PAGE_SECTION_TYPES,
  createBlock,
  createSection,
  groupColumns,
  isContainerSection,
  refitGroupSpans,
  settingText,
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
 * 这棵树里有没有这一列。
 *
 * 编辑器同屏有**三棵**互不相干的树：页面区块、页头区、页脚区。分栏段现在页面和页脚
 * 都能放，于是「这个列 id 属于哪棵树」不再显然——搬移与新建都得先问一句，否则会拿
 * 页面那棵树去找页脚里的列。
 */
export function hasColumnBlock(
  sections: SiteSection[],
  columnBlockId: string,
): boolean {
  for (const section of sections) {
    for (const block of section.blocks) {
      if (!isColumn(block)) continue;
      if (block.id === columnBlockId) return true;
      if (hasColumnBlock(block.sections ?? [], columnBlockId)) return true;
    }
  }
  return false;
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
 * 三条规矩，违反了原样返回（宁可拖不动，也不搬出一棵服务端会拒收的树）：
 * 1. **嵌套只允许一层**——容器段进不了列（服务端 `site.sections_invalid`）
 * 2. 不能拖进自己里面——含自己列里的子段
 * 3. **落点必须在同一棵树里**——见下面那段注释
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

  /*
   * 落点不在这棵树里 → 原样返回。
   *
   * 本函数是**先摘后插**：落点找不到时，插的那一步是空操作，摘掉的那一段就此蒸发。
   * 页面 / 页头 / 页脚是三棵独立的树，调用方按**拖的那一段**在哪棵树里挑 setter，
   * 落点却可能在另一棵——分栏段放行页脚之后，「把页面上的一段拖进页脚分栏的空列」
   * 就是一下点得到的操作，而它会把那一段直接删掉，撤销都没有。
   */
  const landable =
    target.kind === "column"
      ? hasColumnBlock(sections, target.columnBlockId)
      : findSection(sections, target.targetId) !== null;
  if (!landable) return sections;

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
      ? withFittedColumns(section, update(section.blocks))
      : section,
  );
}

/**
 * 换掉一段的 blocks，顺带把容器段的列宽份额跟上列数。
 *
 * 列数是 blocks 数出来的，列宽是段上的一个设置——加一列却不动那个设置的话，两者长度
 * 对不上，`resolveGroupSpans` 会整个回落成等分：租户刚调好的 3:9 在加第三列的瞬间
 * 变成 4:4:4，而他并没有碰过列宽。放在这里而不是各个调用点，是因为加、删、以及以后
 * 任何改 blocks 的操作都得守这条，漏一个就又是一次「列宽自己变了」。
 */
function withFittedColumns(
  section: SiteSection,
  blocks: SiteBlock[],
): SiteSection {
  const next: SiteSection = { ...section, blocks };
  if (!isContainerSection(section.type)) return next;
  const before = groupColumns(section).length;
  const after = groupColumns(next).length;
  if (after === 0 || before === after) return next;
  return {
    ...next,
    settings: {
      ...next.settings,
      columns_layout: refitGroupSpans(
        settingText(section.settings, "columns_layout"),
        before,
        after,
      ),
    },
  };
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
