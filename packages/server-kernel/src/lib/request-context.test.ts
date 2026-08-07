import { describe, it, expect } from "vitest";

import {
  runWithRequestContext,
  getRequestContext,
  updateRequestContext,
  runWithSystemContext,
  type RequestContext,
} from "./request-context.js";

function makeCtx(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    route: "/api/test",
    method: "GET",
    tenant_id: "tenant-a",
    tenant_slug: "tenant-a",
    user_id: "user-1",
    username: "tester",
    request_id: "req-1",
    source: "http",
    ...overrides,
  };
}

describe("request-context", () => {
  describe("runWithRequestContext", () => {
    it("在回调内可读到上下文", () => {
      const ctx = makeCtx();
      runWithRequestContext(ctx, () => {
        expect(getRequestContext()).toBe(ctx);
      });
    });

    it("回调返回值透传", () => {
      const result = runWithRequestContext(makeCtx(), () => 42);
      expect(result).toBe(42);
    });

    it("回调外取不到上下文(null)", () => {
      expect(getRequestContext()).toBeNull();
      runWithRequestContext(makeCtx(), () => {
        // 内部设置过
        expect(getRequestContext()).not.toBeNull();
      });
      // 出来后清空
      expect(getRequestContext()).toBeNull();
    });
  });

  describe("并发隔离(AsyncLocalStorage 核心保证)", () => {
    it("嵌套上下文:内层读到内层,退出后回到外层", () => {
      const a = makeCtx({ tenant_id: "tenant-a" });
      const b = makeCtx({ tenant_id: "tenant-b" });

      runWithRequestContext(a, () => {
        expect(getRequestContext()?.tenant_id).toBe("tenant-a");
        runWithRequestContext(b, () => {
          // 内层 b 覆盖外层
          expect(getRequestContext()?.tenant_id).toBe("tenant-b");
        });
        // 退出 b 回调后回到 a
        expect(getRequestContext()?.tenant_id).toBe("tenant-a");
      });
    });

    it("await 之后仍读到正确的租户(不串扰)", async () => {
      const seen: (string | null)[] = [];
      await Promise.all([
        runWithRequestContext(makeCtx({ tenant_id: "t1" }), async () => {
          await Promise.resolve();
          seen.push(getRequestContext()?.tenant_id ?? null);
        }),
        runWithRequestContext(makeCtx({ tenant_id: "t2" }), async () => {
          await Promise.resolve();
          seen.push(getRequestContext()?.tenant_id ?? null);
        }),
      ]);
      expect(seen.sort()).toEqual(["t1", "t2"]);
    });
  });

  describe("updateRequestContext", () => {
    it("就地补丁当前上下文(认证中间件场景)", () => {
      const ctx = makeCtx({ tenant_id: null, user_id: null });
      runWithRequestContext(ctx, () => {
        updateRequestContext({ tenant_id: "tenant-resolved", user_id: "u-9" });
        expect(getRequestContext()?.tenant_id).toBe("tenant-resolved");
        expect(getRequestContext()?.user_id).toBe("u-9");
        // 未补丁的字段保持不变
        expect(getRequestContext()?.route).toBe("/api/test");
      });
    });

    it("无上下文时静默忽略(启动期脚本)", () => {
      expect(() => updateRequestContext({ tenant_id: "x" })).not.toThrow();
      expect(getRequestContext()).toBeNull();
    });

    it("修改的是同一个对象(而不是替换)", () => {
      const ctx = makeCtx();
      const ref = ctx;
      runWithRequestContext(ctx, () => {
        updateRequestContext({ user_id: "patched" });
      });
      // 出上下文后对象本身已被修改(这正是「就地」语义)
      expect(ref.user_id).toBe("patched");
    });
  });

  describe("runWithSystemContext", () => {
    it("建立无租户身份的系统上下文", () => {
      runWithSystemContext("worker", "/jobs/cleanup", () => {
        const ctx = getRequestContext();
        expect(ctx?.source).toBe("worker");
        expect(ctx?.route).toBe("/jobs/cleanup");
        expect(ctx?.method).toBe("SYSTEM");
        expect(ctx?.tenant_id).toBeNull();
        expect(ctx?.user_id).toBeNull();
      });
    });

    it("scheduler source 同样可用", () => {
      runWithSystemContext("scheduler", "/cron/nightly", () => {
        expect(getRequestContext()?.source).toBe("scheduler");
      });
    });
  });
});
