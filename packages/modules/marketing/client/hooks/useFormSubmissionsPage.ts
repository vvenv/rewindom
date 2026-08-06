import {
  parseListPage,
  parseListPageSize,
} from "@be-water/client-kit/lib/list-url-params";
import { useSearchParams } from "react-router";

/**
 * 提交列表的 URL 状态。
 *
 * 没有排序：提交恒按时间倒序——「最新的在最上面」是这份列表唯一有意义的顺序，
 * 按访客填的内容排没有用途，给一堆排不动的表头反而是噪声。
 */
export function useFormSubmissionsPage() {
  const [searchParams] = useSearchParams();

  return {
    page: parseListPage(searchParams.get("page")),
    pageSize: parseListPageSize(searchParams.get("page_size")),
  };
}
