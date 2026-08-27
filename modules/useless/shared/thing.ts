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

/** 今天那条。池子空时 thing 为 null——这是正常状态，不是错误。 */
export interface TodayThingResponse {
  thing: Thing | null;
}
