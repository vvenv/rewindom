export interface Bookmark {
  id: string;
  tenant_id: string;
  url: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BookmarkListItem {
  id: string;
  url: string;
  title: string;
  description_preview: string;
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

export interface CreateBookmarkBody {
  url: string;
  title: string;
  description?: string;
}

export interface UpdateBookmarkBody {
  url?: string;
  title?: string;
  description?: string;
}
