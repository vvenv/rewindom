import { describe, it, expect, beforeEach } from "vitest";

import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  hasErrorCode,
} from "./app-errors.js";
import { resetServerI18nCatalogsForTests } from "./i18n/registry.js";

describe("app-errors", () => {
  beforeEach(() => {
    // 每条用例从干净的 kernel 消息目录开始,避免相互影响
    resetServerI18nCatalogsForTests();
  });

  describe("AppError", () => {
    it("字符串构造:用 message 作 message,默认 status 500", () => {
      const err = new AppError("boom");
      expect(err.message).toBe("boom");
      expect(err.status).toBe(500);
      expect(err.statusCode).toBe(500); // Fastify 读 statusCode
      expect(err.name).toBe("AppError");
      expect(err.code).toBeUndefined();
    });

    it("字符串构造可显式传 status 与 code", () => {
      const err = new AppError("boom", 503, "SERVICE_DOWN");
      expect(err.status).toBe(503);
      expect(err.code).toBe("SERVICE_DOWN");
    });

    it("对象构造:用 code 翻译出 message(走 i18n catalog)", () => {
      const err = new AppError({
        code: "common.not_found",
        status: 404,
      });
      expect(err.code).toBe("common.not_found");
      expect(err.status).toBe(404);
      // message 来自 catalog 的 zh-CN 模板(不是裸 code)
      expect(err.message).not.toBe("common.not_found");
      expect(err.message.length).toBeGreaterThan(0);
    });

    it("对象构造支持 params 透传(供 i18n 插值与前端)", () => {
      const err = new AppError({
        code: "common.not_found",
        status: 404,
        params: { resource: "note", id: 7 },
      });
      expect(err.params).toEqual({ resource: "note", id: 7 });
    });

    it("对象构造 message 显式覆盖 catalog 翻译", () => {
      const err = new AppError({
        code: "common.not_found",
        status: 404,
        message: "自定义文案",
      });
      expect(err.message).toBe("自定义文案");
    });
  });

  describe("子类状态码", () => {
    it("NotFoundError 默认 404", () => {
      const err = new NotFoundError();
      expect(err.status).toBe(404);
      expect(err.code).toBe("common.not_found");
    });

    it("UnauthorizedError 默认 401", () => {
      expect(new UnauthorizedError().status).toBe(401);
    });

    it("ForbiddenError 默认 403", () => {
      expect(new ForbiddenError().status).toBe(403);
    });

    it("ConflictError 默认 409", () => {
      expect(new ConflictError().status).toBe(409);
    });

    it("ValidationError 默认 400", () => {
      expect(new ValidationError().status).toBe(400);
    });
  });

  describe("code 路径", () => {
    it("传稳定 code 走 i18n 翻译", () => {
      const err = new NotFoundError("common.not_found");
      expect(err.code).toBe("common.not_found");
      expect(err.message).not.toBe("common.not_found");
    });

    it("ValidationError 支持 params 透传", () => {
      const err = new ValidationError("common.validation_error", {
        field: "x",
      });
      expect(err.params).toEqual({ field: "x" });
    });

    it("ValidationError 自由文本保留 message、code 固定", () => {
      const err = new ValidationError("bad input");
      expect(err.code).toBe("common.validation_error");
      expect(err.message).toBe("bad input");
    });
  });

  describe("hasErrorCode", () => {
    it("命中 AppError.code 返回 true", () => {
      const err = new NotFoundError("common.not_found");
      expect(hasErrorCode(err, "common.not_found")).toBe(true);
    });

    it("code 不匹配返回 false", () => {
      const err = new NotFoundError("common.not_found");
      expect(hasErrorCode(err, "other.code")).toBe(false);
    });

    it("非对象 / null 返回 false", () => {
      expect(hasErrorCode(null, "x")).toBe(false);
      expect(hasErrorCode(undefined, "x")).toBe(false);
      expect(hasErrorCode("string", "x")).toBe(false);
    });

    it("无 code 字段的对象返回 false", () => {
      expect(hasErrorCode({ foo: 1 }, "x")).toBe(false);
    });
  });
});
