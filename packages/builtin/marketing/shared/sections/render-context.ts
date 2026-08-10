/**
 * SSR 渲染的上下文与渲染器签名。
 *
 * 与 `types.ts` 分开是为了断环：这里要引 `site-cms` 的页面目录类型，而 `site-cms`
 * 反过来引 `section-schema`（它 re-export 了 `types.ts`）。把这两个类型留在 `types.ts`
 * 会连成一圈，而模块包的 `import-x/no-cycle` 是 error。只有各段的 `html.ts` 引本文件，
 * 那条链上没有任何东西回指它。
 */

import type { SiteSection } from "./types.js";
import type { PublicDocDetail, PublicDocSummary } from "../marketing-doc.js";
import type { PublicSitePage } from "../site-cms.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 文档库的渲染数据（`doc-*` 段的数据源）。
 *
 * 与 `pages` 并列而不是塞进 `pages`：文档不是页面，它们不进 section 体系、不参与
 * 站点导航、也没有各自的版式——只有**两张模板页**（`doc_index` / `doc_article`）
 * 负责画它们，见 `server/marketing-doc.ssr.ts`。
 */
export interface DocRenderContext {
  /** 已发布文档目录（`doc-list` / `doc-nav`）。索引与详情页都有。 */
  docs?: readonly PublicDocSummary[];
  /**
   * 当前正在看的那一篇（`doc-article` / `doc-toc`）。
   *
   * 只有详情模板页有；索引页与普通页面上是 `undefined`——那两个段因此什么都不渲染，
   * 与「段放错了地方」同一个观感（不输出，而不是输出一块空壳）。
   */
  doc?: PublicDocDetail;
  /** 文档索引的逻辑路径（`/docs`）；返回链与列表链接的基准。 */
  docsIndexPath?: string;
}

/** `page-menu` 等需要站点目录的 section 渲染上下文。 */
export interface SectionRenderContext extends DocRenderContext {
  pages?: PublicSitePage[];
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
  /** 主题的「区块间距」；容器段要拿它算列内子段之间的缝。 */
  sectionSpacing?: number;
  /**
   * 本租户已开通的 entitlement。
   *
   * 只有贡献段用得上：渲染器按进程注册（模块装进这个部署就有），开通与否却是按租户的，
   * 所以要在渲染时按租户拦一道。不传等于「一个贡献段都不渲染」——公开渲染路径必须传，
   * 漏传的后果是内容少了而不是多了，这个方向是安全的。
   */
  enabledEntitlements?: ReadonlySet<string>;
  /**
   * 贡献段的按请求数据。
   *
   * key 用**模块 id** 做命名空间，值的形状由贡献方自己定义与断言——marketing 不认识
   * 任何业务模块的类型（同 `registerSectionDefinition` 的方向）。会员登录表单要知道
   * 「验证码开没开、哪几家 OAuth 可用、上一次提交错在哪」，这些都是按请求变的，
   * 塞不进段的 settings 里。
   *
   * 贡献方自己导出一个读取函数（如 `readMemberAuthContext(ctx)`）收口断言，别让每个
   * 渲染器各写一遍 `as`。
   */
  contributed?: Readonly<Record<string, unknown>>;
  /**
   * 渲染一整段（含外层色块）——**只有容器段用得上**，由聚合层 `renderSectionHtml`
   * 在下钻时注入。
   *
   * 不让 `group/html.ts` 直接 import 聚合层，是因为聚合层本来就要 import 它：
   * 那条边会成环。注入之后依赖方向只有一条（聚合层 → 各段），加多少段都不会变。
   */
  renderSection?: (
    section: SiteSection,
    gap: number,
    ctx: SectionRenderContext,
    options?: { contained?: boolean },
  ) => string;
}

/**
 * 一段的 SSR 渲染器：只产出**段内正文**，外层色块（留白 / 底色 / 分隔线 / 限宽）
 * 由聚合层的 `renderSectionHtml` 统一承担，和客户端 `SiteSections` 保持同构。
 */
export type SectionHtmlRenderer = (
  section: SiteSection,
  ctx: SectionRenderContext,
) => string;
