/**
 * Fastify + Vite env 类型增强——外部模块编译期所需的 declare module。
 *
 * 这些增强在运行时由 apps/server 装载内核与 rbac 模块时注册；
 * 此文件仅用于 TypeScript 类型检查，不包含运行时代码。
 *
 * `server.ts` 通过 `import "./fastify-augmentations.js"` 拉入本文件，
 * 使所有从 `@be-water/module-sdk/server` 导入的外部模块都能看到完整的类型。
 */
import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthActorType } from "@be-water/shared";

// ---- Fastify 实例 / 请求上的装饰器类型（运行时由 kernel + rbac 注册） ----------

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireTenantAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requirePlatformAdmin: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requirePermission: (
      permission: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAnyPermission: (
      ...permissions: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    hasPermission: (
      request: FastifyRequest,
      permission: string,
    ) => Promise<boolean>;
  }

  interface FastifyRequest {
    authUser?: {
      userId: string;
      username: string;
      actor_type: AuthActorType;
      is_system_admin: boolean;
      tenant_id: string;
      tenant_slug: string;
    };
    tenantContext?: {
      tenant_id: string;
      tenant_slug: string;
    };
    hostTenantContext?: {
      tenant_id: string;
      tenant_slug: string;
      name: string;
    } | null;
    userPermissions?: string[];
  }
}

// ---- Vite env 类型（client-kit 源码使用 import.meta.env）-----------------------

declare global {
  interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
    readonly BASE_URL: string;
    readonly SSR: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
