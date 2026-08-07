import { isServerMessageCode } from "./i18n/format-message.js";
import { translateServerMessage } from "./i18n/registry.js";

export interface AppErrorInit {
  code: string;
  status: number;
  params?: Record<string, unknown>;
  /** 覆盖目录中的默认 zh-CN 文案（少用）。 */
  message?: string;
}

/**
 * 自定义错误类。
 *
 * 推荐：`new AppError({ code: "notes.not_found", status: 404 })`
 */
export class AppError extends Error {
  status: number;
  /** Fastify error-handler 读 statusCode。 */
  statusCode: number;
  code?: string;
  params?: Record<string, unknown>;

  constructor(
    messageOrInit: string | AppErrorInit,
    status?: number,
    code?: string,
  ) {
    if (typeof messageOrInit === "object") {
      const init = messageOrInit;
      const message =
        init.message ??
        translateServerMessage("zh-CN", {
          code: init.code,
          params: init.params,
          message: init.code,
        });
      super(message);
      this.name = "AppError";
      this.status = init.status;
      this.statusCode = init.status;
      this.code = init.code;
      this.params = init.params;
      return;
    }

    super(messageOrInit);
    this.name = "AppError";
    this.status = status ?? 500;
    this.statusCode = this.status;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(code = "common.not_found", params?: Record<string, unknown>) {
    super({ code, status: 404, params });
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = "common.unauthorized") {
    super({ code, status: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(code = "common.forbidden") {
    super({ code, status: 403 });
  }
}

export class ConflictError extends AppError {
  constructor(code = "common.conflict") {
    super({ code, status: 409 });
  }
}

/**
 * 校验失败。优先传稳定 code；解析器等仍可传自由文本，此时 code 固定为
 * `common.validation_error`，message 保留原文。
 */
export class ValidationError extends AppError {
  constructor(
    messageOrCode = "common.validation_error",
    params?: Record<string, unknown>,
  ) {
    if (isServerMessageCode(messageOrCode)) {
      super({ code: messageOrCode, status: 400, params });
      return;
    }
    super({
      code: "common.validation_error",
      status: 400,
      params,
      message: messageOrCode,
    });
  }
}

/** 判断未知错误是否带有指定稳定 code（AppError / 结构化错误）。 */
export function hasErrorCode(err: unknown, code: string): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === code
  );
}
