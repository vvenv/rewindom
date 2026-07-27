import type { PlatformNavContribution } from "@be-water/client-kit";

export const errorLogPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "observability",
      children: [
        { to: "/platform/error-logs", label: "错误日志", end: true },
      ],
    },
  ];
