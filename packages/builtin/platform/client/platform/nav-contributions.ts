import type { PlatformNavContribution } from "@rewindom/client-kit";

/**
 * 套餐挂在计费分组、排在订阅与付款前面：先有定价，才有人来订。
 *
 * 放在**平台控制台**而不是租户的「系统管理」下：这是平台级数据，一份定价管所有
 * 组织。摆到租户侧等于让每个组织都能改自己要付多少钱。
 *
 * 数据备份挂在运维分组：整库动作，不是配置项，不该塞进「平台设置」。
 */
export const platformNavContributions: readonly PlatformNavContribution[] = [
  {
    kind: "group-children",
    group: "commerce",
    order: 10,
    children: [
      {
        to: "/platform/plans",
        label: "platform:nav.plans",
        end: true,
      },
    ],
  },
  {
    kind: "group-children",
    group: "observability",
    // 排在审计 / 错误 / 慢查询之后：整库动作放运维末尾，避免误点
    order: 200,
    children: [
      {
        to: "/platform/backup",
        label: "platform:nav.backup",
        end: true,
      },
    ],
  },
];
