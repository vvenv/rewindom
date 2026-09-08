import { ShieldBan } from "lucide-react";

import type { PlatformNavContribution } from "@rewindom/client-kit";

/**
 * 用根级 `link` 而不是塞进现有分组：访问控制既不是 commerce 也不是 observability。
 * 平台侧栏的固定分组只有那两个（见 `platform-nav-types.ts`），
 * 装不进分组的就该是根级入口。
 */
export const ipAccessPlatformNavContributions: readonly PlatformNavContribution[] =
  [
    {
      kind: "link",
      order: 60,
      to: "/platform/ip-rules",
      label: "ip-access:nav.platform",
      icon: ShieldBan,
    },
  ];
