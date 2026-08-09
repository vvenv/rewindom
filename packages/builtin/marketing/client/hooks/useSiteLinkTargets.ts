import { useQuery } from "@tanstack/react-query";

import {
  fetchSiteLinkTargets,
  SITE_LINK_TARGETS_QUERY_KEY,
} from "../lib/site-api.js";

/**
 * 编辑器填链接时的站内候选。
 *
 * `enabled: false` + 由控件在打开下拉时 `refetch()`：填链接是低频动作，编辑器一打开
 * 就顺带拉一遍全部页面与文档标题，绝大多数会话里都白拉。
 */
export function useSiteLinkTargets() {
  return useQuery({
    queryKey: SITE_LINK_TARGETS_QUERY_KEY,
    queryFn: fetchSiteLinkTargets,
    enabled: false,
    // 一次编辑会话里页面 / 文档不会频繁增删，拉过就不必再拉
    staleTime: 60_000,
  });
}
