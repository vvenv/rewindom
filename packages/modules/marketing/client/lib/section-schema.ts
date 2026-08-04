import {
  PAGE_SECTION_TYPES,
  createBlock,
  createSection,
  type PageSectionType,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "../../shared/section-schema.js";

export { PAGE_SECTION_TYPES, createBlock, createSection };
export type { PageSectionType, SiteBlock, SiteSection };

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

export function moveSection(
  sections: SiteSection[],
  index: number,
  direction: -1 | 1,
): SiteSection[] {
  return moveItem(sections, index, direction);
}

export function updateSectionSettings(
  sections: SiteSection[],
  sectionId: string,
  settings: SettingValues,
): SiteSection[] {
  return sections.map((section) =>
    section.id === sectionId ? { ...section, settings } : section,
  );
}

export function removeSection(
  sections: SiteSection[],
  sectionId: string,
): SiteSection[] {
  return sections.filter((section) => section.id !== sectionId);
}

export function addSection(
  sections: SiteSection[],
  type: PageSectionType,
): SiteSection[] {
  return [...sections, createSection(type)];
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                     */
/* -------------------------------------------------------------------------- */

function mapSectionBlocks(
  sections: SiteSection[],
  sectionId: string,
  update: (blocks: SiteBlock[]) => SiteBlock[],
): SiteSection[] {
  return sections.map((section) =>
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
  const section = sections.find((item) => item.id === sectionId);
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
