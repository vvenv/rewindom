/**
 * 表单纯函数。校验只做「一眼能看出来的错」，权威判定在服务端——
 * 两边都写一份 CIDR 语义迟早会漂移。
 */
import {
  IPV6_MIN_BLOCK_PREFIX,
  parseCidr,
  type IpAccessRuleDto,
  type IpAccessRuleWriteBody,
  type IpRuleAction,
  type IpRuleMode,
} from "../../shared/index.js";

import type { TFunction } from "i18next";

export interface IpRuleFormValues {
  cidr: string;
  action: IpRuleAction;
  mode: IpRuleMode;
  reason: string;
  /** ISO 串；空串表示永不过期 */
  expires_at: string;
}

export const INITIAL_IP_RULE_FORM: IpRuleFormValues = {
  cidr: "",
  action: "block",
  // 默认「仅记录」：先看清楚这条规则会伤到谁
  mode: "log_only",
  reason: "",
  expires_at: "",
};

export function toIpRuleForm(rule: IpAccessRuleDto): IpRuleFormValues {
  return {
    cidr: rule.cidr,
    action: rule.action,
    mode: rule.mode,
    reason: rule.reason,
    expires_at: rule.expires_at ?? "",
  };
}

export function validateIpRuleForm(
  values: IpRuleFormValues,
  t: TFunction,
): string | null {
  if (!parseCidr(values.cidr)) {
    return t("validation.cidr");
  }
  if (values.reason.trim() === "") {
    return t("validation.reason");
  }
  if (values.expires_at !== "" && Number.isNaN(Date.parse(values.expires_at))) {
    return t("validation.expiresAt");
  }
  return null;
}

export function buildIpRulePayload(
  values: IpRuleFormValues,
): IpAccessRuleWriteBody {
  return {
    cidr: values.cidr.trim(),
    action: values.action,
    mode: values.mode,
    reason: values.reason.trim(),
    expires_at:
      values.expires_at === ""
        ? null
        : new Date(values.expires_at).toISOString(),
  };
}

/**
 * 过细的 IPv6 规则给个提示，但**不拦**。
 *
 * 服务端只对自动规则强制放大；手工写 /128 是允许的，只是基本无效——
 * 与其悄悄改掉用户填的东西，不如告诉他这么写没用。
 */
export function ipv6TooSpecific(cidr: string): boolean {
  const parsed = parseCidr(cidr);
  return parsed !== null && parsed.version === 6 && parsed.prefix > IPV6_MIN_BLOCK_PREFIX;
}
