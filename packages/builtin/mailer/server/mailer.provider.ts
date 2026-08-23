/**
 * `MailProvider` 的实现 —— 内核契约与本模块之间唯一的接缝。
 *
 * 调用方（`site-member` 的邮箱验证、`newsletter` 的摘要投递）拿到的都是这个接口，
 * 谁都不 import 本包。契约留在内核的理由见 provider-contracts.ts 上的注释：
 * 消费方横跨 builtin infra 与外部业务模块两层，而「infra 禁止 import 业务包」。
 */
import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";

import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { MAILER_ENTITLEMENT } from "../shared/index.js";

import { isMailConfigured, sendMail } from "./mail.service.js";

import type {
  MailProvider,
  MailSendInput,
  MailSendResult,
} from "@rewindom/server-kernel/runtime/provider-contracts.js";
import type { FastifyBaseLogger } from "fastify";

export function createMailProvider(log: FastifyBaseLogger): MailProvider {
  return {
    /**
     * 开关与配置是**两道独立的闸**：
     * 关掉 entitlement = 这个租户一封信都不发（哪怕平台配了通道）；
     * 没配置 = 有意愿但没有可用通道。对调用方来说结果一样——都当作没有发信能力，
     * 把依赖发信的入口收起来。
     */
    async isConfigured(tenantId: string): Promise<boolean> {
      if (!(await isTenantModuleEnabled(tenantId, MAILER_ENTITLEMENT.key))) {
        return false;
      }
      return isMailConfigured(tenantId);
    },

    async send(input: MailSendInput): Promise<MailSendResult> {
      if (
        !(await isTenantModuleEnabled(input.tenant_id, MAILER_ENTITLEMENT.key))
      ) {
        throw new AppError({ code: "mailer.not_enabled", status: 403 });
      }
      return sendMail(input, log);
    },
  };
}
