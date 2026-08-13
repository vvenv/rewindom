import { useAppHomePath as useResolveAppHomePath } from "@rewindom/client-kit";

import { useAppShellConfig } from "../contexts/app-shell-context.js";

/** 登录落地页：使用组装层 `homePathCandidates`，自动跳过租户已禁用模块。 */
export function useAppHomePath(): string {
  const { homePathCandidates } = useAppShellConfig();
  return useResolveAppHomePath(homePathCandidates);
}
