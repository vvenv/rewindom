/** 一天一个「无用的」。text = 一句话；embed = 可交互的东西（游戏、按钮…）。 */
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
  text: string;
  /** 只在沙箱 iframe 里执行，绝不直接注入页面。 */
  html: string;
  /** `YYYY-MM-DD`；null = 未排期。 */
  published_on: string | null;
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
  text: string;
  published_on: string | null;
  enabled: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateThingBody {
  kind?: ThingKind;
  title?: string;
  text?: string;
  html?: string;
  published_on?: string | null;
  enabled?: boolean;
}

export interface UpdateThingBody {
  kind?: ThingKind;
  title?: string;
  text?: string;
  html?: string;
  published_on?: string | null;
  enabled?: boolean;
}

/** 某一天那条。null = 那天没有东西，是正常状态不是错误。 */
export interface TodayThingResponse {
  thing: Thing | null;
}

/** 归档的边界与相邻天，给日期选择器与上一天 / 下一天用。全是 `YYYY-MM-DD`。 */
export interface ThingArchiveBounds {
  earliest: string | null;
  latest: string | null;
}

/** 中台预览：整张站点页面的 HTML，中台用沙箱 iframe 显示它。 */
export interface ThingPreviewResponse {
  html: string;
}
