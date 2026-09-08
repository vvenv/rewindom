/**
 * 把名单渲染成 nginx 片段，交给边缘层执行。
 *
 * 为什么还要这一层：静态资源由 nginx 直出，根本不进 Node，应用层的判定管不到；
 * 而高频扫描在应用层拦下时，TCP + TLS + 事件循环的开销已经付掉了。
 *
 * 为什么用 `geo` 而不是一堆 `deny`：`ngx_http_access_module` 的 `deny` 是线性表，
 * 几千条就会明显拖慢每个请求；`geo` 是基数树，查一次与条数无关。
 *
 * 只导出**平台全局 + enforce + block** 的规则：
 * - 租户级规则要先知道 Host 属于谁，nginx 这里没有那个上下文
 * - `log_only` 的全部意义就是不拦
 * - `allow` 不导出，边缘层默认就是放行；豁免语义留在应用层，避免两边规则集
 *   各自演化后打架
 */
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { config } from "@rewindom/server-kernel/lib/config.js";
import { createModuleLogger } from "@rewindom/server-kernel/lib/logger.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";

const log = createModuleLogger("ip-access");

export interface NginxExportResult {
  /** 未配置导出路径时为 null */
  path: string | null;
  count: number;
  skipped: boolean;
}

export function renderNginxGeoBlock(cidrs: string[]): string {
  const lines = [
    "# 由 module-ip-access 自动生成，请勿手改。",
    "# 引用方式（nginx.conf 的 http 段）：",
    "#   include /path/to/blocklist.conf;",
    "# 然后在 server 段：",
    "#   if ($ip_access_blocked) { return 403; }",
    "geo $ip_access_blocked {",
    "    default 0;",
  ];
  for (const cidr of cidrs) {
    lines.push(`    ${cidr} 1;`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

export async function exportNginxBlocklist(): Promise<NginxExportResult> {
  const target = config.ipAccess.nginxExportPath.trim();
  if (target === "") {
    return { path: null, count: 0, skipped: true };
  }

  const rows = await prisma.ipAccessRule.findMany({
    where: {
      tenant_id: null,
      action: "block",
      mode: "enforce",
      OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
    },
    select: { cidr: true },
    orderBy: { cidr: "asc" },
  });
  const cidrs = rows.map((row) => row.cidr);

  await mkdir(path.dirname(target), { recursive: true });
  // 先写临时文件再 rename：nginx 可能正好在 reload 读这个文件，
  // 半截内容会让它整个配置校验失败。同目录 rename 在 POSIX 上是原子的。
  const tmp = `${target}.tmp`;
  await writeFile(tmp, renderNginxGeoBlock(cidrs), "utf8");
  await rename(tmp, target);

  log.info({ path: target, count: cidrs.length }, "已导出 nginx 封禁名单");
  return { path: target, count: cidrs.length, skipped: false };
}

/**
 * 写操作后触发导出，失败只记日志。
 *
 * 导出是边缘层的**冗余**执行路径，应用层判定本身已经生效；
 * 为了它失败一个规则创建请求不划算。
 */
export function scheduleNginxExport(): void {
  if (config.ipAccess.nginxExportPath.trim() === "") return;
  void exportNginxBlocklist().catch((error: unknown) => {
    log.error({ error }, "导出 nginx 封禁名单失败");
  });
}
