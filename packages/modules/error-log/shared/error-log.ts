import type { JsonValue } from "@be-water/shared";

export const ErrorLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

export type ErrorLevelType = (typeof ErrorLevel)[keyof typeof ErrorLevel];

export const ERROR_LEVEL_LABELS: Record<ErrorLevelType, string> = {
  [ErrorLevel.ERROR]: "错误",
  [ErrorLevel.WARN]: "警告",
  [ErrorLevel.INFO]: "信息",
  [ErrorLevel.DEBUG]: "调试",
};

export const ERROR_LEVEL_COLORS: Record<
  ErrorLevelType,
  "destructive" | "outline" | "secondary" | "ghost"
> = {
  [ErrorLevel.ERROR]: "destructive",
  [ErrorLevel.WARN]: "outline",
  [ErrorLevel.INFO]: "secondary",
  [ErrorLevel.DEBUG]: "ghost",
};

export interface ErrorLog {
  id: string;
  level: string;
  message: string;
  stack_trace: string | null;
  user_id: string | null;
  username: string | null;
  tenant_slug?: string | null;
  /** 平台侧列表按 slug 回填的租户名称。 */
  tenant_name?: string | null;
  route: string | null;
  method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  /** 以下四项是 jsonb 列，走 API 传回来仍是结构化值，不是字符串 */
  request_body: JsonValue | null;
  request_params: JsonValue | null;
  request_query: JsonValue | null;
  error_code: string | null;
  context: JsonValue | null;
  created_at: string;
}

export interface ErrorStats {
  total: number;
  by_level: Record<string, number>;
  by_route: Record<string, number>;
  by_error_code: Record<string, number>;
}
