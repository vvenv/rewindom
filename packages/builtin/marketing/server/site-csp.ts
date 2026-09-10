/**
 * 公开面（Marketing SSR）的内容安全策略。
 *
 * ## 为什么公开面不能照搬应用壳层那份
 *
 * 应用壳层是静态文件、内容全在我们手里，可以在构建期把内联脚本 hash 进策略，
 * 直接 enforce（见 apps/client/scripts/gen-csp.mjs）。公开面不行：页面上还有
 * **租户配的第三方统计脚本**，来源因站而异。一刀切 `script-src 'self'` 会把每个
 * 租户的统计打死，而且是**静默**打死——页面照常显示，只是再也收不到数据。
 *
 * 好在统计不是任意 HTML，而是 `{provider, script_url, site_id}`，供应商是固定枚举
 * （见 shared/site-analytics.ts）。所以来源能按站点精确算出来。
 *
 * ## 三类脚本，三种放行方式
 *
 * | 脚本 | 放行方式 | 为什么 |
 * | --- | --- | --- |
 * | 我们自己的内联块（JSON-LD、明暗模式） | 每响应 nonce | 内容随页面变 |
 * | 统计的内联片段（GA config / GTM / Clarity 加载器） | 按配置算 hash | 内容由配置唯一决定，可随响应一起缓存 |
 * | 统计的外部脚本 | origin 白名单 | 第三方地址，只能按来源放行 |
 *
 * nonce 与 hash 的分工不是随意的：SSR 响应发的是 `public, max-age=60`，
 * 会被共享缓存收走。nonce 每请求都变，缓存下来就是一份**失效**的策略；
 * 而由配置决定的 hash 与缓存天然一致。
 *
 * ## 默认只报告不拦
 *
 * 与限流同一个道理：策略配错的代价（整站脚本被拦）比它防的问题严重得多。
 * 默认 `report`，先在浏览器控制台/上报里看几天真实违规，再切 `enforce`。
 * 用了 GTM 的站点尤其要看——GTM 容器里可以再装任意第三方标签，那些来源
 * 在这里是不可知的。
 */
import { createHash, randomBytes } from "node:crypto";

import { config } from "@rewindom/server-kernel/lib/config.js";

import {
  normalizeSiteAnalytics,
  renderSiteAnalyticsHtml,
  type SiteAnalyticsProvider,
} from "../shared/site-analytics.js";

export interface SiteCspSources {
  script: string[];
  connect: string[];
  img: string[];
  frame: string[];
  /** 统计内联片段的 `'sha256-…'` */
  scriptHashes: string[];
}

const EMPTY_SOURCES: SiteCspSources = {
  script: [],
  connect: [],
  img: [],
  frame: [],
  scriptHashes: [],
};

/**
 * 各供应商除脚本地址之外还要打的地方（回传、像素、iframe）。
 *
 * 这份表只能靠供应商文档维护——回传地址不出现在页面 HTML 里，扫不出来。
 * 漏了的表现是「统计脚本能加载但数据传不出去」，比脚本被拦更难查。
 */
const PROVIDER_EXTRA: Partial<
  Record<SiteAnalyticsProvider, Omit<SiteCspSources, "scriptHashes" | "script">>
> = {
  google_analytics: {
    connect: [
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://www.googletagmanager.com",
    ],
    img: ["https://www.google-analytics.com", "https://www.googletagmanager.com"],
    frame: [],
  },
  google_tag_manager: {
    connect: [
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://www.googletagmanager.com",
    ],
    img: ["https://www.google-analytics.com", "https://www.googletagmanager.com"],
    // noscript 兜底是个指向 googletagmanager 的 iframe
    frame: ["https://www.googletagmanager.com"],
  },
  microsoft_clarity: {
    connect: ["https://*.clarity.ms"],
    img: ["https://*.clarity.ms"],
    frame: [],
  },
};

/** CSP 的 hash 源：对元素**内容**做 sha256，属性（含 nonce）不参与。 */
export function sha256CspSource(content: string): string {
  return `'sha256-${createHash("sha256").update(content, "utf8").digest("base64")}'`;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function inlineScriptContents(html: string): string[] {
  return [
    ...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gu),
  ].map((match) => match[1] ?? "");
}

function externalScriptOrigins(html: string): string[] {
  return [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gu)]
    .map((match) => originOf(match[1] ?? ""))
    .filter((origin) => origin !== "");
}

/**
 * 算出一个站点的统计配置需要放行什么。
 *
 * 输入是**归一化后的配置**，不是最终页面：从页面扫描等于「页面上出现什么脚本
 * 就放行什么」，正好把 CSP 的作用反过来。这里扫的是我们自己按配置生成的片段。
 */
export function siteAnalyticsCspSources(input: unknown): SiteCspSources {
  const analytics = normalizeSiteAnalytics(input);
  if (analytics.scripts.length === 0) return EMPTY_SOURCES;

  const merged: SiteCspSources = {
    script: [],
    connect: [],
    img: [],
    frame: [],
    scriptHashes: [],
  };

  for (const script of analytics.scripts) {
    // 单条渲染：拿到的正是这条配置最终会出现在页面上的那段 HTML
    const head = renderSiteAnalyticsHtml({ scripts: [script] });
    merged.script.push(...externalScriptOrigins(head));
    for (const content of inlineScriptContents(head)) {
      merged.scriptHashes.push(sha256CspSource(content));
    }

    const extra = PROVIDER_EXTRA[script.provider];
    if (extra) {
      merged.connect.push(...extra.connect);
      merged.img.push(...extra.img);
      merged.frame.push(...extra.frame);
    } else {
      // 自托管的 plausible / umami / custom：脚本与回传都在同一个 origin
      merged.connect.push(...externalScriptOrigins(head));
    }
  }

  return {
    script: [...new Set(merged.script)],
    connect: [...new Set(merged.connect)],
    img: [...new Set(merged.img)],
    frame: [...new Set(merged.frame)],
    scriptHashes: [...new Set(merged.scriptHashes)],
  };
}

/** 每响应一个 nonce。128 位随机，用 CSPRNG。 */
export function createCspNonce(): string {
  return randomBytes(16).toString("base64");
}

export function buildSiteCspPolicy(input: {
  nonce: string;
  /** 站点的 `analytics` 原始配置（未渲染） */
  analytics?: unknown;
}): string {
  const sources = siteAnalyticsCspSources(input.analytics);
  const nonceSource = `'nonce-${input.nonce}'`;

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    [
      "script-src",
      ["'self'", nonceSource, ...sources.scriptHashes, ...sources.script],
    ],
    /*
     * 公开面同样保留 'unsafe-inline'：站点主题 CSS 是内联 <style>，
     * 而 site-enhance 那支增强脚本还会在运行时再插一个 <style>
     * （见 shared/site-enhance.generated.ts）。收紧要先改掉那两处。
     */
    ["style-src", ["'self'", "'unsafe-inline'"]],
    // 租户可以填任意外链图片（logo / og:image / 区块配图）
    ["img-src", ["'self'", "data:", "blob:", "https:", ...sources.img]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", ...sources.connect]],
    ["media-src", ["'self'", "data:", "blob:", "https:"]],
    ["frame-src", ["'self'", ...sources.frame]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];

  return directives
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/**
 * 该发哪个头。`off` 时返回 null——调用方据此不发。
 *
 * `report` 用 `-Report-Only`：浏览器照常执行，只把违规报到控制台
 * （配了 report-uri 才会上报）。这是切 enforce 之前唯一安全的观察方式。
 */
export function siteCspHeaderName(): string | null {
  switch (config.site.cspMode) {
    case "enforce":
      return "content-security-policy";
    case "report":
      return "content-security-policy-report-only";
    default:
      return null;
  }
}
