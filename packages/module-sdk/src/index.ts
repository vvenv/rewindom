/**
 * @rewindom/module-sdk
 *
 * 外部模块编译期依赖的契约入口。三个子入口按上下文分离：
 *
 *   - @rewindom/module-sdk          → shared 契约（无框架依赖，安全在任何上下文 import）
 *   - @rewindom/module-sdk/server   → shared + server-kernel 运行时（仅 server 代码用）
 *   - @rewindom/module-sdk/client   → shared + client-kit 运行时（仅 client 代码用）
 *
 * 默认入口只导出 shared，避免 server-kernel 类型泄漏到 client 编译上下文。
 * server / client 代码应分别从 ./server / ./client 导入，以获得完整类型表面。
 *
 * 边界规则（由 scripts/verify-module.mjs 强制）：
 *   外部模块只许 import 自 @rewindom/module-sdk（+ @rewindom/ui 原语 + 第三方库），
 *   不许直接 import @rewindom/server-kernel / client-kit / shared / modules。
 */
export * from "./shared.js";
