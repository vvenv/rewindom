import type { PlatformNavContribution } from "@rewindom/client-kit";

/** 挂在平台「计费」分组，排在套餐配置后面。 */
export const billingPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "commerce",
      order: 20,
      children: [
        {
          to: "/platform/billing",
          label: "billing:nav.billing",
          end: true,
        },
      ],
    },
  ];
