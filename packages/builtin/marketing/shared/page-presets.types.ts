/**
 * 页面预设的类型骨架。
 *
 * 与 `page-presets.ts` 分开是为了断环：模板页注册表（`page-templates.ts`）要引
 * `PagePreset`，而 `page-presets.ts` 反过来要引注册表里的固定 slug。留在一个文件里
 * 就连成一圈，而模块包的 `import-x/no-cycle` 是 error。本文件只依赖 setting 的类型。
 */

import type { SettingValues } from "./section-settings.js";

/** 解析预设里的 i18n key；客户端传 `t`，服务端传 locale 查表函数。 */
export type PresetTranslateFn = (key: string) => string;

export interface PresetBlock {
  type: string;
  /** setting id → i18n key（值会被 `t()` 解析） */
  text?: Record<string, string>;
  /** setting id → 字面量（图标名、布尔、数字这类不翻译的值） */
  raw?: SettingValues;
  /** 仅容器 block（`group` 的列）：列里装的子段。 */
  sections?: PresetSection[];
}

export interface PresetSection {
  /**
   * 段 type。用开放的 `string` 而不是 `PageSectionType`：贡献段（`site-member.*`）
   * 同样要能进预设，它们的 type 在编译期无从枚举（同 `SectionType` 的理由）。
   */
  type: string;
  text?: Record<string, string>;
  raw?: SettingValues;
  blocks?: PresetBlock[];
}

/**
 * 页面预设：一键铺出一套版式。
 *
 * 预设只描述**结构 + i18n key**（`ns:key`）。文案在创建时展开成整张 `__i18n`
 * 表，公开面再按 URL 语言压扁——不要先 t() 成单语字符串。租户拿到的是可以
 * 随便改的普通内容；复制到另一语言时库存句换成目标语言，改过的才搬原文。
 */
export interface PagePreset {
  key: string;
  /** i18n key */
  label: string;
  kind: string;
  slug: string;
  titleKey: string;
  descriptionKey: string;
  sections: PresetSection[];
}
