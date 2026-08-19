/**
 * `www.<apex>` → `<apex>` 的规范主机判定。
 *
 * 租户的 `custom_domain` 是精确匹配，`www.yestino.com` 匹配不上 `yestino.com`，
 * 于是访客拿到「这个 Host 没绑站点」的 404 —— 而 nginx 的 `server_name` 与证书
 * 本来就覆盖了 www。推广时这是实打实的损失：名片、口头传播、老书签、
 * 以及仍然自动补 www 的输入框，全落在一张 404 上。
 *
 * **不做**「让 www 也渲染同一份内容」：那会让同一份内容有两个可访问地址、
 * 各自 self-canonical，搜索引擎按两个站看待。
 */

/** 判定所需的最小依赖：给定主机名，它绑没绑站点。 */
export type HostBoundLookup = (hostname: string) => Promise<boolean>;

/**
 * 该不该把这次请求跳到裸域；不该跳则 null。
 *
 * 两道闸门缺一不可（`apex` 是不是「像个域名」不必单独判——`www.com` 剥成 `com`
 * 之后自然过不了绑定这一关，而单标签的 `www.localhost` 在本地是真的要跳）：
 * - **www 自己没绑**——有人把 `www.a.com` 直接填成 custom_domain 时那是显式配置，按它渲染
 * - **apex 真的绑着**——反过来写（见 www 就剥）会打死
 *   `FRONTEND_URL=https://www.example.com` 这种把 www 当正式域名的部署：那时
 *   apex 没绑，跳过去就是 404
 */
export async function resolveWwwCanonicalHost(
  hostname: string | null,
  isBound: HostBoundLookup,
): Promise<string | null> {
  if (!hostname || !hostname.startsWith("www.")) return null;
  const apex = hostname.slice("www.".length);
  if (!apex) return null;
  if (await isBound(hostname)) return null;
  if (!(await isBound(apex))) return null;
  return apex;
}

/**
 * 把 origin 里的主机名换成规范主机，其余（协议、端口）原样保留。
 *
 * 端口要留住：本地与自建端口的部署上，丢了端口这一跳就跳到不存在的地址。
 */
export function swapOriginHost(origin: string, nextHost: string): string | null {
  try {
    const url = new URL(origin);
    url.hostname = nextHost;
    // `new URL().toString()` 会补一个尾斜杠，而调用方要自己接 request.url
    return url.origin;
  } catch {
    return null;
  }
}
