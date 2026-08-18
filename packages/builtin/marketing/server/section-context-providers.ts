/**
 * 贡献段的**按请求数据**从哪来 —— 通用页面渲染路径上的注入点。
 *
 * 背景：`SectionRenderContext.contributed` 早就有了，但只有**模块自有的 SSR 路由**
 * 填得上（会员登录页、会员账单页都是自己那条 handler）。一个能摆在**任意页面**上、
 * 又需要查库的段（定价区要读平台的套餐配置）就没地方拿数据——段渲染器是同步的，
 * 而查库是异步的。
 *
 * 方向与 `registerSiteSectionHtml` 一致：注册表定义在 marketing，业务模块自己把
 * provider 填进来。marketing 不认识任何业务模块的数据形状，只负责在渲染前把它们
 * 都 await 掉、按模块 id 合进 `contributed`。
 *
 * **按需调用**：provider 声明自己服务哪几个 section type，页面上没摆那些段就一次
 * 查询都不发。定价区是全站唯一一处需要它的地方，不该让每一次页面渲染都付这个代价。
 */

import type { AppLocale } from "@rewindom/shared";

export interface SectionContextInput {
  tenantId: string;
  locale: AppLocale;
  defaultLocale: AppLocale;
  /**
   * 本页用到的段 / 块 type。provider 可按它少查——页头有购物车入口才去 peek 购物车。
   * `resolveSectionContexts` 总会带上。
   */
  usedTypes?: ReadonlySet<string>;
  /** 读 cookie（购物车 id 等）；没有就不带。 */
  cookies?: { get(name: string): string | undefined };
  /** 已登录的站点会员；访客为 null / 不传。 */
  memberId?: string | null;
  /**
   * 已发布站点的 `home_path`。贡献段生成站内链接时用（事件雷达当首页则详情在 `/:slug`）。
   */
  homePath?: string;
  /** 已发布站点的 `home_layout_key`；与 `homePath` 一起决定公开前缀。 */
  homeLayoutKey?: string;
}

export interface SectionContextProvider {
  /** 这个 provider 服务哪几个 section type；页面上一个都没摆就不调用。 */
  sectionTypes: readonly string[];
  /**
   * 返回值按**模块 id** 分键，与 `contributed` 同一套命名空间口径
   *（贡献方自己导出 `readXxxContext(ctx)` 收口断言）。
   */
  provide: (input: SectionContextInput) => Promise<Record<string, unknown>>;
}

const PROVIDERS: SectionContextProvider[] = [];

/** 从 Cookie 头读单个键。贡献方（购物车 id）用，marketing 自己不认任何业务 cookie。 */
export function cookiesFromHeader(
  header: string | string[] | undefined,
): { get(name: string): string | undefined } {
  const raw = Array.isArray(header) ? header.join("; ") : header;
  return {
    get(name: string): string | undefined {
      if (!raw) return undefined;
      for (const part of raw.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key !== name) continue;
        try {
          return decodeURIComponent(rest.join("="));
        } catch {
          return rest.join("=");
        }
      }
      return undefined;
    },
  };
}

/** 登记一个 provider；在模块 `onBoot` 里调。 */
export function registerSectionContextProvider(
  provider: SectionContextProvider,
): void {
  if (PROVIDERS.includes(provider)) return;
  PROVIDERS.push(provider);
}

/** 仅供测试：清空注册表。 */
export function resetSectionContextProviders(): void {
  PROVIDERS.length = 0;
}

/**
 * 把这张页面用得上的 provider 都跑一遍，合成 `contributed`。
 *
 * 单个 provider 失败不该让整张页面 500：定价区取不到数据时那一段自己会什么都不渲染
 *（`readSiteBillingContext` / `readBillingPlansContext` 返回 null 的那一支），
 * 比让访客看见一个错误页好得多。
 */
export async function resolveSectionContexts(
  input: SectionContextInput & { usedSectionTypes: ReadonlySet<string> },
): Promise<Record<string, unknown> | undefined> {
  const applicable = PROVIDERS.filter((provider) =>
    provider.sectionTypes.some((type) => input.usedSectionTypes.has(type)),
  );
  if (applicable.length === 0) return undefined;

  const results = await Promise.all(
    applicable.map(async (provider) => {
      try {
        return await provider.provide({
          tenantId: input.tenantId,
          locale: input.locale,
          defaultLocale: input.defaultLocale,
          usedTypes: input.usedSectionTypes,
          cookies: input.cookies,
          memberId: input.memberId,
          homePath: input.homePath,
          homeLayoutKey: input.homeLayoutKey,
        });
      } catch {
        return {};
      }
    }),
  );

  return Object.assign({}, ...results) as Record<string, unknown>;
}
