export interface Note {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteListItem {
  id: string;
  title: string;
  content_preview: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteBody {
  title: string;
  content?: string;
}

export interface UpdateNoteBody {
  title?: string;
  content?: string;
}
