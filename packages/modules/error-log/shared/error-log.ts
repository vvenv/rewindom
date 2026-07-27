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
  route: string | null;
  method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_body: string | null;
  request_params: string | null;
  request_query: string | null;
  error_code: string | null;
  context: string | null;
  created_at: string;
}

export interface ErrorStats {
  total: number;
  byLevel: Record<string, number>;
  byRoute: Record<string, number>;
  byErrorCode: Record<string, number>;
}
