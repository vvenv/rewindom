/**
 * sitemap.xml 的贡献点。
 *
 * 页面条目由 marketing 自己列；文档库、店面那些「不是 MarketingPage」的地址
 * 由模块填进来。单个 provider 失败不该让整份 sitemap 500。
 */

import type { SitemapEntry } from "./site.service.js";

export interface SitemapProvider {
  provide: (tenantId: string) => Promise<readonly SitemapEntry[]>;
}

const PROVIDERS: SitemapProvider[] = [];

export function registerSitemapProvider(provider: SitemapProvider): void {
  if (PROVIDERS.includes(provider)) return;
  PROVIDERS.push(provider);
}

export function resetSitemapProviders(): void {
  PROVIDERS.length = 0;
}

export async function resolveContributedSitemapEntries(
  tenantId: string,
): Promise<SitemapEntry[]> {
  if (PROVIDERS.length === 0) return [];
  const batches = await Promise.all(
    PROVIDERS.map(async (provider) => {
      try {
        return [...(await provider.provide(tenantId))];
      } catch {
        return [];
      }
    }),
  );
  return batches.flat();
}
