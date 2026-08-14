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
export * from "@rewindom/server-kernel/runtime/module-contract.js";
export * from "@rewindom/server-kernel/runtime/provider-registry.js";
export * from "@rewindom/server-kernel/runtime/provider-contracts.js";
export * from "@rewindom/server-kernel/runtime/event-bus.js";
export * from "@rewindom/server-kernel/runtime/domain-events.js";
export * from "@rewindom/server-kernel/runtime/job-registry.js";
export * from "@rewindom/server-kernel/runtime/register-tenant-gated-routes.js";
export * from "@rewindom/server-kernel/runtime/audit-log-emit.js";
export * from "@rewindom/server-kernel/http/define-route.js";
export * from "@rewindom/server-kernel/http/list-sort.js";
export * from "@rewindom/server-kernel/http/multipart-upload.js";
export * from "@rewindom/server-kernel/http/pagination.js";
export * from "@rewindom/server-kernel/http/coded-error.js";
export { Prisma } from "@rewindom/server-kernel/generated/prisma/client/client.js";
export * from "@rewindom/server-kernel/lib/app-errors.js";
export * from "@rewindom/server-kernel/lib/prisma.js";
export * from "@rewindom/server-kernel/lib/tenant-scope.js";
export * from "@rewindom/server-kernel/lib/config.js";
export * from "@rewindom/server-kernel/lib/host-tenant.js";
export * from "@rewindom/server-kernel/lib/tenant-secret-crypto.js";
export {
  translateServerMessage,
} from "@rewindom/server-kernel/lib/i18n/registry.js";
export { resolveRequestLocale } from "@rewindom/server-kernel/lib/i18n/translate.js";
