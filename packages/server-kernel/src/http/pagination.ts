import { parseIntParam } from "./request-parser.js";

export interface ParsedPagination {
  page: number;
  page_size: number;
}

/** display-catalog 全量目录拉取上限，与客户端 catalog page_size 一致 */
export const DISPLAY_CATALOG_MAX_PAGE_SIZE = 999;

export function parseDisplayCatalogPagination(
  query: Record<string, unknown>,
): ParsedPagination {
  return parsePagination(query, {
    maxPageSize: DISPLAY_CATALOG_MAX_PAGE_SIZE,
  });
}

export function parsePagination(
  query: Record<string, unknown>,
  defaults: { page?: number; page_size?: number; maxPageSize?: number } = {},
): ParsedPagination {
  const {
    page: defaultPage = 1,
    page_size: defaultPageSize = 20,
    maxPageSize = 100,
  } = defaults;

  const page = Math.max(1, parseIntParam(query.page) ?? defaultPage);
  const page_size = Math.min(
    maxPageSize,
    Math.max(1, parseIntParam(query.page_size) ?? defaultPageSize),
  );

  return { page, page_size };
}
