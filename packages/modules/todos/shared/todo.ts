export interface Todo {
  id: string;
  tenant_id: string;
  title: string;
  completed: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TodoListItem {
  id: string;
  title: string;
  completed: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoBody {
  title: string;
  /** 有 DB 默认值，创建时可不传 */
  completed?: boolean;
}

export interface UpdateTodoBody {
  title?: string;
  completed?: boolean;
}
