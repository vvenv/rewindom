import { Tags } from "lucide-react";

import type { PlatformNavContribution } from "@be-water/client-kit";

/**
 * 套餐配置 —— 排在订阅与付款（billing 的 order 35）前面：先有定价，才有人来订。
 *
 * 放在**平台控制台**而不是租户的「系统管理」下：这是平台级数据，一份定价管所有
 * 组织。摆到租户侧等于让每个组织都能改自己要付多少钱。
 */
export const platformNavContributions: readonly PlatformNavContribution[] = [
  {
    kind: "link",
    order: 30,
    to: "/platform/plans",
    label: "platform:nav.plans",
    icon: Tags,
    end: true,
  },
];
