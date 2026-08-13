/**
 * module-sdk / client — 外部模块 client 端编译期依赖的契约入口。
 *
 * 只在 client 代码中 import；包含 shared 契约 + client-kit
 * 的 UI 运行时（PageLayout / api / hooks / nav 类型 等）。
 *
 * 不 re-export 任何 server-kernel 类型，避免 server 类型泄漏到 client 编译上下文。
 */
export * from "./shared.js";

// ---- Client 契约与 UI 运行时
export * from "@rewindom/client-kit";
