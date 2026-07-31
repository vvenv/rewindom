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
 * 兼容：`new AppError("笔记不存在", 404, "NOT_FOUND")`（仍可走遗留中文目录）
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
  /**
   * @param messageOrCode 稳定 code（`notes.not_found`）或遗留中文 / 资源名
   */
  constructor(
    messageOrCode = "common.not_found",
    params?: Record<string, unknown>,
  ) {
    if (isServerMessageCode(messageOrCode)) {
      super({ code: messageOrCode, status: 404, params });
      return;
    }
    const message = messageOrCode.endsWith("不存在")
      ? messageOrCode
      : `${messageOrCode}不存在`;
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(messageOrCode = "common.unauthorized") {
    if (isServerMessageCode(messageOrCode)) {
      super({ code: messageOrCode, status: 401 });
      return;
    }
    super(messageOrCode, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(messageOrCode = "common.forbidden") {
    if (isServerMessageCode(messageOrCode)) {
      super({ code: messageOrCode, status: 403 });
      return;
    }
    super(messageOrCode, 403, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(messageOrCode = "common.conflict") {
    if (isServerMessageCode(messageOrCode)) {
      super({ code: messageOrCode, status: 409 });
      return;
    }
    super(messageOrCode, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(
    messageOrCode = "common.validation_error",
    params?: Record<string, unknown>,
  ) {
    if (isServerMessageCode(messageOrCode)) {
      super({ code: messageOrCode, status: 400, params });
      return;
    }
    super(messageOrCode, 400, "VALIDATION_ERROR");
  }
}
