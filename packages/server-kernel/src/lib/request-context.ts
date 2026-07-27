/**
 * Request context — 关联 Prisma query 事件与 HTTP/worker 请求上下文
 *
 * 用 AsyncLocalStorage 而非模块级变量：并发请求下模块级变量会互相覆盖
 * （请求 A await 期间被请求 B 改写，A 恢复后读到 B 的租户），
 * 租户守卫（tenant-guard）以本上下文为准，这类串扰会直接变成跨租户越权。
 *
 * 生命周期：在最外层 onRequest 用 `runWithRequestContext` 包住整条请求链，
 * 认证中间件稍后用 `updateRequestContext` 就地补上租户与用户身份。
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  route: string;
  method: string;
  tenant_id: string | null;
  tenant_slug: string | null;
  user_id: string | null;
  username: string | null;
  request_id: string | null;
  source: "http" | "worker" | "scheduler" | "unknown";
}

const storage = new AsyncLocalStorage<RequestContext>();

/** 在 `ctx` 绑定的异步上下文中执行 `fn`，`fn` 内部派生的所有异步操作都能读到它。 */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | null {
  return storage.getStore() ?? null;
}

/**
 * 就地修改当前上下文。
 *
 * AsyncLocalStorage 的 store 无法从内层替换，因此认证中间件补充身份信息
 * 走「修改同一个对象」而不是「换一个对象」。无上下文时静默忽略
 * （非 /api 请求、启动期脚本）。
 */
export function updateRequestContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore();
  if (ctx) {
    Object.assign(ctx, patch);
  }
}

/**
 * 后台任务 / 定时器等没有 HTTP 请求的场景：显式建立一个上下文。
 * 不带租户身份，因此租户守卫不会对其注入过滤条件。
 */
export function runWithSystemContext<T>(
  source: Extract<RequestContext["source"], "worker" | "scheduler">,
  route: string,
  fn: () => T,
): T {
  return runWithRequestContext(
    {
      route,
      method: "SYSTEM",
      tenant_id: null,
      tenant_slug: null,
      user_id: null,
      username: null,
      request_id: null,
      source,
    },
    fn,
  );
}
