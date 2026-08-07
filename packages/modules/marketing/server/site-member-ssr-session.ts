import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * SSR 解析会员会话的注入点（marketing 定义，site-member 填实现）。
 *
 * 有 HttpOnly cookie 时，首屏即可解锁门控页并渲染账号菜单。
 */
export interface SiteMemberSsrProfile {
  id: string;
  email: string;
  display_name: string;
}

export type SiteMemberSsrSessionResolver = (input: {
  request: FastifyRequest;
  reply: FastifyReply;
  tenantId: string;
}) => Promise<SiteMemberSsrProfile | null>;

let resolver: SiteMemberSsrSessionResolver | null = null;

export function registerSiteMemberSsrSession(
  fn: SiteMemberSsrSessionResolver,
): void {
  resolver = fn;
}

/** 仅供测试。 */
export function resetSiteMemberSsrSession(): void {
  resolver = null;
}

export async function resolveSiteMemberSsrSession(input: {
  request: FastifyRequest;
  reply: FastifyReply;
  tenantId: string | null;
}): Promise<SiteMemberSsrProfile | null> {
  if (!input.tenantId || !resolver) return null;
  return resolver({
    request: input.request,
    reply: input.reply,
    tenantId: input.tenantId,
  });
}
