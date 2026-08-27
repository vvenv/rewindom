export interface Thing {
  id: string;
  tenant_id: string;
  text: string;
  enabled: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThingListItem {
  id: string;
  text: string;
  enabled: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateThingBody {
  text: string;
  enabled?: boolean;
}

export interface UpdateThingBody {
  text?: string;
  enabled?: boolean;
}
