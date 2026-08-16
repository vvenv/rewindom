/**
 * 后台目录接口的取值语言：显式 `?locale=` 优先于 Accept-Language。
 *
 * 主题编辑器里的【商品列表】【分类列表】与实站共用同一套渲染器，预览时必须按
 * **当前选中页面的 locale** 取标题——而不是后台界面语言：编辑一张 en 页面时
 * 界面还是中文，标题却应当显示英文那份。后台自己的列表页不传这个参数，仍跟着
 * 界面语言走。
 */

import { isAppLocale, resolveRequestLocale } from "@rewindom/module-sdk/server";

import type { AppLocale } from "@rewindom/module-sdk";
import type { FastifyRequest } from "fastify";

export function resolveCatalogLocale(request: FastifyRequest): AppLocale {
  const raw = (request.query as { locale?: unknown } | null | undefined)?.locale;
  return isAppLocale(raw) ? raw : resolveRequestLocale(request);
}
