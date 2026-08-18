import { useSearchParams } from "react-router";

import { parseEditorScope } from "../lib/site-editor-url.js";

/**
 * 编辑器的 URL 状态（`?page=` / `?scope=`）。
 *
 * 外观是从卡片链过来的独立入口（`?scope=theme`），不再在页面编辑器里切层，
 * 所以这里只读 URL、不写。
 */
export function useSiteEditorPage() {
  const [searchParams] = useSearchParams();

  return {
    pageId: searchParams.get("page") ?? undefined,
    scope: parseEditorScope(searchParams.get("scope")),
  };
}
