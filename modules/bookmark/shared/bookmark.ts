export interface Bookmark {
  id: string;
  tenant_id: string;
  url: string;
  /** URL 的主机名（去 www.）。 */
  host: string;
  title: string;
  description: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkListItem {
  id: string;
  url: string;
  host: string;
  title: string;
  description_preview: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkListResult {
  items: BookmarkListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

/** 筛选栏的站点分组：当前站点下有多少条书签。 */
export interface BookmarkHostFacet {
  host: string;
  count: number;
}

export interface BookmarkHostsResult {
  items: BookmarkHostFacet[];
}

export interface CreateBookmarkBody {
  url: string;
  /** 留空时服务端用主机名兜底，粘贴一个链接就能存。 */
  title?: string;
  description?: string;
}

export interface UpdateBookmarkBody {
  url?: string;
  title?: string;
  description?: string;
}
