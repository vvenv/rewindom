/** 一件「无用的」。text = 一句话；embed = 可交互的东西（游戏、按钮…）。 */
export type ThingKind = "text" | "embed";

export const THING_KINDS: readonly ThingKind[] = ["text", "embed"];

export function isThingKind(value: unknown): value is ThingKind {
  return typeof value === "string" && (THING_KINDS as readonly string[]).includes(value);
}

export interface Thing {
  id: string;
  tenant_id: string;
  kind: ThingKind;
  title: string;
  slug: string;
  text: string;
  /** 详情页直接注入；工作台预览跑在沙箱 iframe 里。 */
  html: string;
  /** 列表卡片用的截图 URL；空串 = 列表用可交互物自己的缩小预览。 */
  thumbnail: string;
  enabled: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThingListItem {
  id: string;
  kind: ThingKind;
  title: string;
  slug: string;
  text: string;
  html: string;
  thumbnail: string;
  enabled: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateThingBody {
  kind?: ThingKind;
  title?: string;
  slug?: string;
  text?: string;
  html?: string;
  thumbnail?: string;
  enabled?: boolean;
}

export interface UpdateThingBody {
  kind?: ThingKind;
  title?: string;
  slug?: string;
  text?: string;
  html?: string;
  thumbnail?: string;
  enabled?: boolean;
}

/** 中台预览：整张站点页面的 HTML，中台用沙箱 iframe 显示它。 */
export interface ThingPreviewResponse {
  html: string;
}
