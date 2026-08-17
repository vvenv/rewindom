/**
 * 编辑器「填链接」下拉的贡献点。
 *
 * marketing 只列页面；文档篇、商品、以后的内容域自己把候选填进来。
 */

import type { SiteLinkTarget } from "../shared/site-link-target.js";
import type { AppLocale } from "@rewindom/shared";

export interface LinkTargetProvider {
  provide: (
    tenantId: string,
    defaultLocale: AppLocale,
  ) => Promise<readonly SiteLinkTarget[]>;
}

const PROVIDERS: LinkTargetProvider[] = [];

export function registerLinkTargetProvider(
  provider: LinkTargetProvider,
): void {
  if (PROVIDERS.includes(provider)) return;
  PROVIDERS.push(provider);
}

export function resetLinkTargetProviders(): void {
  PROVIDERS.length = 0;
}

export async function resolveContributedLinkTargets(
  tenantId: string,
  defaultLocale: AppLocale,
): Promise<SiteLinkTarget[]> {
  if (PROVIDERS.length === 0) return [];
  const batches = await Promise.all(
    PROVIDERS.map(async (provider) => {
      try {
        return [...(await provider.provide(tenantId, defaultLocale))];
      } catch {
        return [];
      }
    }),
  );
  return batches.flat();
}
