import {
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import {
  bindSourceIconUrl,
  buildSourceIconIndex,
} from "../../shared/source-icon.js";

/** 本站采集源 name → favicon URL。每请求一次，~70 行。 */
export async function loadSourceIconIndex(
  tenantId: string,
  tenantSlug?: string | null,
): Promise<ReadonlyMap<string, string>> {
  const rows = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId),
    select: { name: true, url: true, connector: true },
  });
  return buildSourceIconIndex(rows, bindSourceIconUrl(tenantSlug));
}
