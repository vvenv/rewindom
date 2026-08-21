/**
 * 来源 favicon 的主机名与取图地址。
 *
 * icon 代表**发行人**（采集源），不是文章域名。HN 的信号 URL 是目标站，
 * 拿它当 favicon 会在「Hacker News」旁边画出被链站点的标。
 *
 * 取图地址是本站 `/events/icons/{host}`：访客不打 Google，由服务端去源站拉。
 */

const FEED_HOST_PREFIXES = new Set(["feeds", "feed", "rss", "search"]);

/**
 * 剥完 feeds. 前缀仍不是品牌域的，显式改写。
 * 只收目录里真实出现过的别名，不猜。
 */
const ICON_HOST_ALIAS: Record<string, string> = {
  "feeds.bbci.co.uk": "bbc.com",
  "feeds.a.dj.com": "wsj.com",
  "hacker-news.firebaseio.com": "news.ycombinator.com",
  "githubstatus.com": "github.com",
  "cloudflarestatus.com": "cloudflare.com",
  "status.openai.com": "openai.com",
  "status.anthropic.com": "anthropic.com",
  "status.slack.com": "slack.com",
  "status.npmjs.org": "npmjs.com",
};

const BLOCKED_ICON_TLDS = new Set([
  "local",
  "localhost",
  "internal",
  "intranet",
  "lan",
  "home",
  "corp",
  "private",
]);

/**
 * 公网主机名才给去抓。拒 IP、localhost、内网 TLD——路径上的 host 会进出站请求。
 */
export function isIconHost(value: string): boolean {
  if (value.length < 4 || value.length > 253) {
    return false;
  }
  if (value.startsWith("-") || value.endsWith("-") || value.startsWith(".")) {
    return false;
  }
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/u.test(value)) {
    return false;
  }
  const tld = value.slice(value.lastIndexOf(".") + 1);
  return !BLOCKED_ICON_TLDS.has(tld);
}

/** 公开页同源地址。开发态靠 Vite 把这条代理给 Fastify（Accept 是 image/*）。 */
export function sourceIconUrlFromHost(host: string): string {
  return `/events/icons/${encodeURIComponent(host)}`;
}

/**
 * 工作台用。`<img>` 不带 JWT，必须走 `/api`（Vite 始终代理），
 * 租户写在路径里，和站点媒体库同一套。
 */
export function sourceIconApiUrl(tenantSlug: string, host: string): string {
  return `/api/public/tenants/${encodeURIComponent(tenantSlug)}/events/icons/${encodeURIComponent(host)}`;
}

export function bindSourceIconUrl(
  tenantSlug?: string | null,
): (host: string) => string {
  return tenantSlug
    ? (host) => sourceIconApiUrl(tenantSlug, host)
    : sourceIconUrlFromHost;
}

export function iconHostFromUrl(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.startsWith("www.")) {
    host = host.slice(4);
  }
  const aliased = ICON_HOST_ALIAS[host];
  if (aliased) {
    return aliased;
  }
  const labels = host.split(".");
  const prefix = labels[0];
  if (labels.length >= 3 && prefix && FEED_HOST_PREFIXES.has(prefix)) {
    host = labels.slice(1).join(".");
  }
  return isIconHost(host) ? host : null;
}

export function sourceIconHost(feed: {
  connector: string;
  url: string;
}): string | null {
  if (feed.connector === "hackernews") {
    return "news.ycombinator.com";
  }
  return iconHostFromUrl(feed.url);
}

export function sourceIconUrl(
  feed: {
    connector: string;
    url: string;
  },
  toUrl: (host: string) => string = sourceIconUrlFromHost,
): string | null {
  const host = sourceIconHost(feed);
  return host ? toUrl(host) : null;
}

export function sourceIconUrlFromPageUrl(
  url: string,
  toUrl: (host: string) => string = sourceIconUrlFromHost,
): string | null {
  const host = iconHostFromUrl(url);
  return host ? toUrl(host) : null;
}

export function buildSourceIconIndex(
  feeds: readonly { name: string; url: string; connector: string }[],
  toUrl: (host: string) => string = sourceIconUrlFromHost,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const feed of feeds) {
    const url = sourceIconUrl(feed, toUrl);
    if (url) {
      map.set(feed.name, url);
    }
  }
  return map;
}

export function sourceIconUrlsForNames(
  names: readonly string[],
  icons: ReadonlyMap<string, string> | undefined,
): (string | null)[] {
  return names.map((name) => icons?.get(name) ?? null);
}

/**
 * 卡片按源名查索引；详情 / 时间线在索引未命中时退回 URL 推导
 *（源被删或改名后，RSS 条目自己的域名通常还在）。
 * HN 即使退回也走 connector，不会拿目标站的标。
 */
export function resolveSourceIconUrl(input: {
  name?: string;
  url?: string | null;
  connector?: string;
  icons?: ReadonlyMap<string, string>;
  toUrl?: (host: string) => string;
}): string | null {
  const toUrl = input.toUrl ?? sourceIconUrlFromHost;
  if (input.name) {
    const fromIndex = input.icons?.get(input.name);
    if (fromIndex) {
      return fromIndex;
    }
  }
  if (input.connector === "hackernews") {
    return toUrl("news.ycombinator.com");
  }
  if (input.connector && input.url) {
    return sourceIconUrl(
      { connector: input.connector, url: input.url },
      toUrl,
    );
  }
  return input.url ? sourceIconUrlFromPageUrl(input.url, toUrl) : null;
}
