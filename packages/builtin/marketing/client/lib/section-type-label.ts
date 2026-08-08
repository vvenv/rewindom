import { getSectionDefinition } from "../../shared/section-schema.js";

/**
 * 段类型的显示名。
 *
 * 贡献段的 `label` 用**带命名空间的** key（如 `site-member:section.gate`）——它的文案
 * 在贡献方自己的 i18n 包里，而这里的 `t` 绑在 `marketing` 上。i18next 认前缀，
 * 所以贡献方只要照常声明 `client.i18n` 就能显示。
 *
 * 认不出来的段（模块停用后留在页面上的那些）回落到原始 type：树上必须画得出来、
 * 选得中、删得掉，不能因为拿不到定义就空着一行。
 */
export function sectionTypeLabel(
  t: (key: string) => string,
  type: string,
): string {
  const label = getSectionDefinition(type)?.label;
  return label ? t(label) : type;
}
