/**
 * 贡献 chrome 块的客户端渲染表（编辑器预览）。
 *
 * 与 SSR 的 `registerChromeBlockHtml` 成对：React 组件进不了 Fastify。
 */

import type { ComponentType } from "react";

import { registerSectionCss } from "../../../shared/load-marketing-site-css.js";
import { registerChromeBlock } from "../../../shared/sections/_common/chrome-blocks.js";
import { registerBlockIcon } from "../theme-editor/section-icons.js";

import type { BlockDefinition, SiteBlock } from "../../../shared/section-schema.js";
import type { LucideIcon } from "lucide-react";

export interface ChromeBlockViewProps {
  block: SiteBlock;
  /** 与 SSR `ChromeRenderInput.contributed` 同一份。 */
  contributed?: Readonly<Record<string, unknown>>;
}

const CHROME_BLOCK_VIEWS = new Map<
  string,
  ComponentType<ChromeBlockViewProps>
>();

export function registerChromeBlockView(
  definition: BlockDefinition,
  view: ComponentType<ChromeBlockViewProps>,
  options: { css?: string; icon?: LucideIcon } = {},
): void {
  registerChromeBlock(definition);
  CHROME_BLOCK_VIEWS.set(definition.type, view);
  if (options.css) registerSectionCss(definition.type, options.css);
  if (options.icon) registerBlockIcon(definition.type, options.icon);
}

export function getChromeBlockView(
  type: string,
): ComponentType<ChromeBlockViewProps> | undefined {
  return CHROME_BLOCK_VIEWS.get(type);
}

/** 仅供测试。 */
export function resetChromeBlockViews(): void {
  CHROME_BLOCK_VIEWS.clear();
}
