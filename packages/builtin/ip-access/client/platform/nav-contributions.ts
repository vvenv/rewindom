import type { PlatformNavContribution } from "@rewindom/client-kit";

/**
 * 访问控制并入运维：它管的是谁能进这套系统，和审计 / 错误日志同一类操作面。
 * 根级 `link` 会多占一格移动端底栏，装得进固定分组就不要当根入口。
 */
export const ipAccessPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "group-children",
      group: "observability",
      // 排在默认 100 的日志查看器之前：先看谁被拦，再翻日志
      order: 5,
      children: [
        {
          to: "/platform/ip-rules",
          label: "ip-access:nav.platform",
          end: true,
        },
      ],
    },
  ];
