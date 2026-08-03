import {
  SECTION_TYPES,
  createSection,
  type SectionType,
  type SiteSection,
} from "../../shared/theme-sections.js";

export { SECTION_TYPES, createSection };
export type { SectionType, SiteSection };

export function moveSection(
  sections: SiteSection[],
  index: number,
  direction: -1 | 1,
): SiteSection[] {
  const next = index + direction;
  if (next < 0 || next >= sections.length) return sections;
  const copy = [...sections];
  const [item] = copy.splice(index, 1);
  if (!item) return sections;
  copy.splice(next, 0, item);
  return copy;
}

export function updateSectionSettings(
  sections: SiteSection[],
  sectionId: string,
  settings: SiteSection["settings"],
): SiteSection[] {
  return sections.map((section) => {
    if (section.id !== sectionId) return section;
    return { ...section, settings } as SiteSection;
  });
}

export function removeSection(
  sections: SiteSection[],
  sectionId: string,
): SiteSection[] {
  return sections.filter((section) => section.id !== sectionId);
}

export function addSection(
  sections: SiteSection[],
  type: SectionType,
): SiteSection[] {
  return [...sections, createSection(type)];
}
