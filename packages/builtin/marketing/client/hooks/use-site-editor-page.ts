import { useSearchParams } from "react-router";

import { parseEditorScope, type EditorScope } from "../lib/site-editor-url.js";

/** 编辑器的 URL 状态（`?page=` / `?scope=`）读写集中在这里。 */
export function useSiteEditorPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  return {
    pageId: searchParams.get("page") ?? undefined,
    scope: parseEditorScope(searchParams.get("scope")),
    setScope: (next: EditorScope): void => {
      const params = new URLSearchParams(searchParams);
      if (next === "sections") params.delete("scope");
      else params.set("scope", next);
      /*
       * `replace`：切层不该在浏览器历史里堆一串条目，否则「返回」要按好几次才
       * 退得出编辑器。换页仍然走 push（见 `goToPage`）——那是换了编辑对象。
       */
      setSearchParams(params, { replace: true });
    },
  };
}
