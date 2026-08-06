import { sendCodedError } from "@be-water/server-kernel/http/route-error-handler.js";
import { isSiteMemberActor } from "@be-water/shared";

import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * 会员专属接口守卫。
 *
 * 不做成 `app.decorate`：会员是模块级能力，内核不该为它长出一个全局装饰器。
 * 中间件已经把非会员 actor 挡在会员路径之外，这里是第二道（防路径白名单写漏）。
 */
export async function requireSiteMember(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.authUser || !isSiteMemberActor(request.authUser.actor_type)) {
    return sendCodedError(reply, 403, "site_member.member_required");
  }
}
