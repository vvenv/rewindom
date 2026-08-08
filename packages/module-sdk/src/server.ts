/**
 * module-sdk / server — 外部模块 server 端编译期依赖的契约入口。
 *
 * 只在 server 代码中 import；client 代码 import 本入口
 * 会把 server-kernel 的 fastify / prisma 类型拉进 client 编译上下文，导致类型冲突。
 *
 * 包含：shared 契约 + server-kernel 的公共运行时 helper。
 */
import "./fastify-augmentations.js";

export * from "./shared.js";

// ---- Server 契约与运行时 helper
export * from "@be-water/server-kernel/runtime/module-contract.js";
export * from "@be-water/server-kernel/runtime/provider-registry.js";
export * from "@be-water/server-kernel/runtime/provider-contracts.js";
export * from "@be-water/server-kernel/runtime/event-bus.js";
export * from "@be-water/server-kernel/runtime/domain-events.js";
export * from "@be-water/server-kernel/runtime/job-registry.js";
export * from "@be-water/server-kernel/runtime/register-tenant-gated-routes.js";
export * from "@be-water/server-kernel/runtime/audit-log-emit.js";
export * from "@be-water/server-kernel/http/define-route.js";
export * from "@be-water/server-kernel/http/list-sort.js";
export * from "@be-water/server-kernel/http/pagination.js";
export * from "@be-water/server-kernel/http/coded-error.js";
export * from "@be-water/server-kernel/lib/app-errors.js";
export * from "@be-water/server-kernel/lib/prisma.js";
export * from "@be-water/server-kernel/lib/tenant-scope.js";
