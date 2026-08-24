/**
 * 「查看官网」的落点。
 *
 * 租户从自己的绑定域进工作台时，官网就在当前 Host 的 `/`（见 Host 分流）。
 * 平台代登录停在控制台 Host，相对 `/` 会打开中台；这时改指该租户访客看到的地址：
 * 自定义域优先，否则 `{slug}.{TENANT_BASE_DOMAIN}`。
 */

export interface ViewSiteHrefInput {
  impersonating: boolean;
  customDomain: string | null | undefined;
  tenantSlug: string | null | undefined;
  tenantBaseDomain: string | null | undefined;
  location?: Pick<Location, "protocol" | "port">;
}

function trimHost(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function resolveViewSiteHref(input: ViewSiteHrefInput): string {
  if (!input.impersonating) return "/";

  const custom = trimHost(input.customDomain);
  if (custom) return `https://${custom}`;

  const slug = trimHost(input.tenantSlug);
  const base = trimHost(input.tenantBaseDomain);
  if (!slug || !base) return "/";

  const protocol = input.location?.protocol || "https:";
  const port = input.location?.port ? `:${input.location.port}` : "";
  return `${protocol}//${slug}.${base}${port}`;
}
