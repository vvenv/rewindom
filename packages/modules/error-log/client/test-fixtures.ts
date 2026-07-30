import type { ErrorLog } from "../shared/index.js";

/**
 * 本模块的测试 fixture。
 *
 * 放在模块内而非 `@be-water/client-test`：测试设施包被 apps、modules、
 * server-kernel 三方共用，若它反向依赖具体模块会形成包级环。
 */
export function createMockErrorLog(overrides: Partial<ErrorLog> = {}): ErrorLog {
  return {
    id: "error1",
    level: "ERROR",
    message: "Test error message",
    stack_trace: null,
    user_id: null,
    username: null,
    route: null,
    method: null,
    ip_address: null,
    user_agent: null,
    request_body: null,
    request_params: null,
    request_query: null,
    error_code: null,
    context: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
